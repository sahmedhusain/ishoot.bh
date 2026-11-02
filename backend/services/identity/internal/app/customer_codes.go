package app

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
	"platform.local/backend/services/identity/internal/sessions"
)

// CustomerCodes owns email proof, attempt accounting and session creation; the website only delivers the code.
type CustomerCodes struct {
	pool        *pgxpool.Pool
	guard       accounts.Guard
	verifyGuard accounts.Guard
	sessions    *sessions.Service
	login       *accounts.Service
	key         []byte
}

func NewCustomerCodes(pool *pgxpool.Pool, guard accounts.Guard, sessionService *sessions.Service, login *accounts.Service, key []byte, verifyGuard accounts.Guard) *CustomerCodes {
	return &CustomerCodes{pool: pool, guard: guard, verifyGuard: verifyGuard, sessions: sessionService, login: login, key: append([]byte(nil), key...)}
}

func (s *CustomerCodes) digest(email, code string) string {
	h := hmac.New(sha256.New, s.key)
	_, _ = h.Write([]byte("customer-code:" + email + ":" + code))
	return hex.EncodeToString(h.Sum(nil))
}

type CustomerCode struct {
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func (s *CustomerCodes) Issue(ctx context.Context, email, ip string) (CustomerCode, error) {
	email, ok := normalizeEmail(email)
	if !ok {
		return CustomerCode{}, ErrValidation
	}
	if err := s.guard.Check(ctx, authn.RealmCustomer, email, ip); err != nil {
		return CustomerCode{}, err
	}
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return CustomerCode{}, err
	}
	out := CustomerCode{Code: fmt.Sprintf("%06d", n.Int64()), ExpiresAt: time.Now().UTC().Add(10 * time.Minute)}
	id := uuid.NewString()
	err = db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if err := sqlcdb.New(tx).StoreCustomerCode(ctx, sqlcdb.StoreCustomerCodeParams{Email: email, CodeHash: s.digest(email, out.Code), ExpiresAt: out.ExpiresAt, ID: id}); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.challenge.created", Payload: map[string]any{"challengeId": id, "realm": "customer", "changedBy": "service:identity"}})
	})
	return out, err
}

func (s *CustomerCodes) SignIn(ctx context.Context, email, code, otp, ip, agent string) (accounts.Result, error) {
	email, ok := normalizeEmail(email)
	if !ok || len(code) != 6 || len(otp) > 64 || len(agent) > 512 || len(ip) > 45 {
		return accounts.Result{}, accounts.ErrInvalid
	}
	if err := s.verifyGuard.Check(ctx, authn.RealmCustomer, email, ip); err != nil {
		return accounts.Result{}, err
	}
	var result accounts.Result
	var rejected error
	err := db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		row, err := q.LockCustomerCode(ctx, email)
		if errors.Is(err, pgx.ErrNoRows) {
			rejected = accounts.ErrInvalid
			return nil
		}
		if err != nil {
			return err
		}
		now := time.Now().UTC()
		if row.UsedAt != nil || row.Attempts >= 5 || !row.ExpiresAt.After(now) {
			rejected = accounts.ErrInvalid
			return nil
		}
		digest := s.digest(email, code)
		if row.HashKind == "sha256" {
			sum := sha256.Sum256([]byte("customer-code:" + email + ":" + code))
			digest = hex.EncodeToString(sum[:])
		}
		if subtle.ConstantTimeCompare([]byte(digest), []byte(row.CodeHash)) != 1 {
			rejected = accounts.ErrInvalid
			if err := q.FailCustomerCode(ctx, email); err != nil {
				return err
			}
			return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.challenge.changed", Payload: map[string]any{"challengeId": row.ID, "realm": "customer", "changedBy": "service:identity"}})
		}
		created, err := q.CreateCodeCustomer(ctx, sqlcdb.CreateCodeCustomerParams{SubjectID: uuid.NewString(), Email: email})
		if err != nil {
			return err
		}
		account, err := q.LockCustomerByEmail(ctx, email)
		if err != nil {
			return err
		}
		now = time.Now().UTC()
		if !account.Active || !row.ExpiresAt.After(now) {
			return accounts.ErrInvalid
		}
		if created > 0 {
			if err := outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.created", Payload: map[string]any{"subjectId": account.SubjectID, "realm": "customer", "changedBy": "customer:" + account.SubjectID}}); err != nil {
				return err
			}
		}
		result, err = s.startVerified(ctx, tx, account, otp, ip, agent, now)
		if err != nil {
			return err
		}
		return q.ConsumeCustomerCode(ctx, sqlcdb.ConsumeCustomerCodeParams{Email: email, UsedAt: &now})
	})
	if err != nil {
		return accounts.Result{}, err
	}
	if rejected != nil {
		return accounts.Result{}, rejected
	}
	return result, nil
}

func (s *CustomerCodes) startVerified(ctx context.Context, tx pgx.Tx, account sqlcdb.IdentityAccount, otp, ip, agent string, now time.Time) (accounts.Result, error) {
	if account.Realm != "customer" || !account.Active {
		return accounts.Result{}, accounts.ErrInvalid
	}
	q := sqlcdb.New(tx)
	current := accounts.Account{Email: account.Email, Roles: account.Roles, Active: true, Realm: authn.RealmCustomer, SubjectID: account.SubjectID,
		MFAEnabled: account.MfaEnabled, MFASecret: account.MfaSecretEncrypted, LastStep: account.MfaLastStep}
	factor, err := s.login.CheckFactor(current, otp, now)
	if err != nil {
		return accounts.Result{}, err
	}
	if factor.RecoveryHash != "" {
		n, err := q.ConsumeAccountRecovery(ctx, sqlcdb.ConsumeAccountRecoveryParams{Realm: "customer", SubjectID: account.SubjectID, CodeHash: factor.RecoveryHash, UsedAt: &now})
		if err != nil {
			return accounts.Result{}, err
		}
		if n != 1 {
			return accounts.Result{}, accounts.ErrInvalid
		}
	}
	if factor.Step != nil {
		if err := q.SetAccountMFAStep(ctx, sqlcdb.SetAccountMFAStepParams{Realm: "customer", SubjectID: account.SubjectID, MfaLastStep: factor.Step, UpdatedAt: now}); err != nil {
			return accounts.Result{}, err
		}
	}
	credential, err := s.sessions.Prepare(authn.RealmCustomer, account.SubjectID, now)
	if err != nil {
		return accounts.Result{}, err
	}
	if err := q.CreateSessionFamily(ctx, sqlcdb.CreateSessionFamilyParams{ID: credential.Family.ID, Realm: "customer", SubjectID: account.SubjectID, ExpiresAt: credential.Family.ExpiresAt}); err != nil {
		return accounts.Result{}, err
	}
	if err := q.SetSessionDevice(ctx, sqlcdb.SetSessionDeviceParams{ID: credential.Family.ID, UserAgent: &agent, ClientIp: &ip}); err != nil {
		return accounts.Result{}, err
	}
	if err := q.InsertRefreshRecord(ctx, sqlcdb.InsertRefreshRecordParams{TokenHash: credential.Digest(), FamilyID: credential.Family.ID}); err != nil {
		return accounts.Result{}, err
	}
	if err := q.MarkCustomerLogin(ctx, sqlcdb.MarkCustomerLoginParams{Realm: "customer", SubjectID: account.SubjectID, LastLoginAt: &now}); err != nil {
		return accounts.Result{}, err
	}
	err = outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.session.started", Payload: map[string]any{
		"subjectId": account.SubjectID, "realm": "customer", "sessionId": credential.Family.ID, "changedBy": "customer:" + account.SubjectID, "reason": "login",
	}})
	if err != nil {
		return accounts.Result{}, err
	}
	return accounts.Result{Account: current, Credential: credential}, nil
}
