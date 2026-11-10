package app
import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/url"
	"regexp"
	"strings"
	"time"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"platform.local/backend/pkg/authn"
	"platform.local/backend/pkg/db"
	"platform.local/backend/pkg/outbox"
	"platform.local/backend/services/identity/internal/accounts"
	"platform.local/backend/services/identity/internal/oauth"
	"platform.local/backend/services/identity/internal/postgres/sqlcdb"
	"platform.local/backend/services/identity/internal/systemclient"
)
var ErrProviderEmailMissing = errors.New("provider did not confirm an email address")
var ErrProviderConflict = errors.New("provider identity already linked")
var oauthNext = regexp.MustCompile(`^/(en|ar)(/[A-Za-z0-9_/-]*)?$`)
type CustomerOAuth struct {
	guard		accounts.Guard
	pool		*pgxpool.Pool
	codes		*CustomerCodes
	secrets		accounts.SecretReader
	providers	*oauth.Providers
	configuration	func(context.Context, string) (systemclient.SignInConfiguration, error)
	fallbackOrigin	string
}
func NewCustomerOAuth(pool *pgxpool.Pool, codes *CustomerCodes, secrets accounts.SecretReader, source func(context.Context, string) (systemclient.SignInConfiguration, error), fallbackOrigin string, guard accounts.Guard) *CustomerOAuth {
	return &CustomerOAuth{guard: guard, pool: pool, codes: codes, secrets: secrets, providers: oauth.New(), configuration: source, fallbackOrigin: strings.TrimRight(fallbackOrigin, "/")}
}
func randomOAuthToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
type OAuthBegin struct {
	State			string		`json:"state"`
	AuthorizationURL	string		`json:"authorizationUrl"`
	ExpiresAt		time.Time	`json:"expiresAt"`
}
type oauthSecret struct {
	Nonce		string	`json:"nonce"`
	Verifier	string	`json:"verifier"`
}
func (s *CustomerOAuth) config(ctx context.Context, provider string) (systemclient.SignInConfiguration, error) {
	if provider != "google" && provider != "apple" {
		return systemclient.SignInConfiguration{}, oauth.ErrRejected
	}
	if s.configuration == nil {
		return systemclient.SignInConfiguration{}, ErrPolicyUnavailable
	}
	configuration, err := s.configuration(ctx, provider)
	if err != nil || !configuration.Active {
		return systemclient.SignInConfiguration{}, ErrPolicyUnavailable
	}
	return configuration, nil
}
func (s *CustomerOAuth) Begin(ctx context.Context, provider, redirect, next, locale, ip string) (OAuthBegin, error) {
	if (locale != "en" && locale != "ar") || len(next) > 2000 || !oauthNext.MatchString(next) || strings.Contains(next, "//") {
		return OAuthBegin{}, ErrValidation
	}
	state, err := randomOAuthToken()
	if err != nil {
		return OAuthBegin{}, err
	}
	if err := s.guard.Check(ctx, authn.RealmCustomer, state, ip); err != nil {
		return OAuthBegin{}, err
	}
	configuration, err := s.config(ctx, provider)
	if err != nil {
		return OAuthBegin{}, err
	}
	origin := s.fallbackOrigin
	if configuration.WebsiteDomain != "" {
		origin = "https://" + configuration.WebsiteDomain
	}
	u, err := url.Parse(redirect)
	if err != nil || u.User != nil || u.Fragment != "" || u.RawQuery != "" || u.Scheme+"://"+u.Host != origin || u.Path != "/api/account/"+provider+"/callback" {
		return OAuthBegin{}, ErrValidation
	}
	nonce, err := randomOAuthToken()
	if err != nil {
		return OAuthBegin{}, err
	}
	verifier, err := randomOAuthToken()
	if err != nil {
		return OAuthBegin{}, err
	}
	authorization, err := oauth.AuthorizationURL(provider, configuration.Values, redirect, state, nonce, verifier, locale)
	if err != nil {
		return OAuthBegin{}, err
	}
	hash := tokenHash(state)
	raw, err := json.Marshal(oauthSecret{Nonce: nonce, Verifier: verifier})
	if err != nil {
		return OAuthBegin{}, err
	}
	encrypted, err := s.secrets.Seal(raw, "oauth:"+hash)
	if err != nil {
		return OAuthBegin{}, err
	}
	out := OAuthBegin{State: state, AuthorizationURL: authorization, ExpiresAt: time.Now().UTC().Add(10 * time.Minute)}
	err = db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if err := sqlcdb.New(tx).StoreOAuthState(ctx, sqlcdb.StoreOAuthStateParams{StateHash: hash, Provider: provider, RedirectUri: redirect, NextPath: next, Locale: locale, SecretEncrypted: encrypted, ExpiresAt: out.ExpiresAt}); err != nil {
			return err
		}
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.challenge.created", Payload: map[string]any{"challengeId": hash, "realm": "customer", "changedBy": "service:identity"}})
	})
	return out, err
}
type OAuthCompletion struct {
	Result	accounts.Result
	Email	string
	Name	string
	Next	string
	Locale	string
}
func (s *CustomerOAuth) Complete(ctx context.Context, provider, state, browserState, code, otp, name, ip, agent string) (OAuthCompletion, error) {
	if len(state) != 43 || subtle.ConstantTimeCompare([]byte(state), []byte(browserState)) != 1 || len(code) > 8192 || len(otp) > 64 || len([]rune(name)) > 120 || len(ip) > 45 || len(agent) > 512 {
		return OAuthCompletion{}, oauth.ErrRejected
	}
	if err := s.guard.Check(ctx, authn.RealmCustomer, state, ip); err != nil {
		return OAuthCompletion{}, err
	}
	configuration, err := s.config(ctx, provider)
	if err != nil {
		return OAuthCompletion{}, err
	}
	hash := tokenHash(state)
	var saved sqlcdb.IdentityOauthState
	var needsExchange bool
	err = db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		var err error
		saved, err = q.LockOAuthState(ctx, hash)
		if errors.Is(err, pgx.ErrNoRows) {
			return oauth.ErrRejected
		}
		if err != nil {
			return err
		}
		now := time.Now().UTC()
		if saved.Provider != provider || saved.ConsumedAt != nil || !saved.ExpiresAt.After(now) {
			return oauth.ErrRejected
		}
		if saved.ClaimsEncrypted != nil {
			return nil
		}
		if code == "" || saved.ExchangingAt != nil {
			return oauth.ErrRejected
		}
		needsExchange = true
		return q.ClaimOAuthExchange(ctx, sqlcdb.ClaimOAuthExchangeParams{StateHash: hash, ExchangingAt: &now})
	})
	if err != nil {
		return OAuthCompletion{}, err
	}
	var who oauth.Identity
	if needsExchange {
		plain, err := s.secrets.Open(saved.SecretEncrypted, "oauth:"+hash)
		if err != nil {
			return OAuthCompletion{}, oauth.ErrRejected
		}
		var secret oauthSecret
		if json.Unmarshal(plain, &secret) != nil {
			return OAuthCompletion{}, oauth.ErrRejected
		}
		who, err = s.providers.Exchange(ctx, provider, configuration.Values, code, secret.Verifier, saved.RedirectUri, secret.Nonce)
		if err != nil {
			return OAuthCompletion{}, err
		}
		if provider == "apple" && name != "" {
			who.Name = name
		}
		if len([]rune(who.Name)) > 120 {
			who.Name = string([]rune(who.Name)[:120])
		}
		plain, err = json.Marshal(who)
		if err != nil {
			return OAuthCompletion{}, err
		}
		encrypted, err := s.secrets.Seal(plain, "oauth-claims:"+hash)
		if err != nil {
			return OAuthCompletion{}, err
		}
		if err := sqlcdb.New(s.pool).StoreOAuthClaims(ctx, sqlcdb.StoreOAuthClaimsParams{StateHash: hash, ClaimsEncrypted: &encrypted}); err != nil {
			return OAuthCompletion{}, err
		}
	} else {
		plain, err := s.secrets.Open(*saved.ClaimsEncrypted, "oauth-claims:"+hash)
		if err != nil || json.Unmarshal(plain, &who) != nil {
			return OAuthCompletion{}, oauth.ErrRejected
		}
	}
	out := OAuthCompletion{Name: who.Name, Next: saved.NextPath, Locale: saved.Locale}
	err = db.WithTx(ctx, s.pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		q := sqlcdb.New(tx)
		state, err := q.LockOAuthState(ctx, hash)
		if err != nil {
			return err
		}
		now := time.Now().UTC()
		if state.ConsumedAt != nil || !state.ExpiresAt.After(now) {
			return oauth.ErrRejected
		}
		linked, err := q.FindProviderCustomer(ctx, sqlcdb.FindProviderCustomerParams{Provider: provider, ProviderSubject: who.Subject})
		created := false
		var account sqlcdb.IdentityAccount
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			email, valid := normalizeEmail(who.Email)
			if !valid || !who.EmailVerified {
				return ErrProviderEmailMissing
			}
			n, err := q.CreateCodeCustomer(ctx, sqlcdb.CreateCodeCustomerParams{SubjectID: uuid.NewString(), Email: email})
			if err != nil {
				return err
			}
			created = n > 0
			account, err = q.LockCustomerByEmail(ctx, email)
			if err != nil {
				return err
			}
		case err != nil:
			return err
		default:
			account, err = q.LockAccount(ctx, sqlcdb.LockAccountParams{Realm: "customer", SubjectID: linked.SubjectID})
			if err != nil {
				return err
			}
		}
		now = time.Now().UTC()
		if !account.Active || !state.ExpiresAt.After(now) {
			return accounts.ErrInvalid
		}
		if created {
			if err := outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.created", Payload: map[string]any{"subjectId": account.SubjectID, "realm": "customer", "changedBy": "customer:" + account.SubjectID}}); err != nil {
				return err
			}
		}
		out.Result, err = s.codes.startVerified(ctx, tx, account, otp, ip, agent, now)
		if err != nil {
			return err
		}
		if err := q.LinkCustomerProvider(ctx, sqlcdb.LinkCustomerProviderParams{Provider: provider, ProviderSubject: who.Subject, SubjectID: account.SubjectID}); err != nil {
			var conflict *pgconn.PgError
			if errors.As(err, &conflict) && conflict.Code == "23505" {
				return ErrProviderConflict
			}
			return err
		}
		if err := q.ConsumeOAuthState(ctx, sqlcdb.ConsumeOAuthStateParams{StateHash: hash, ConsumedAt: &now}); err != nil {
			return err
		}
		out.Email = account.Email
		return outbox.Enqueue(ctx, tx, "identity", outbox.Event{Subject: "identity.user.changed", Payload: map[string]any{"subjectId": account.SubjectID, "realm": "customer", "changedBy": "customer:" + account.SubjectID}})
	})
	return out, err
}
func (s *CustomerOAuth) Available(ctx context.Context) map[string]bool {
	result := map[string]bool{"google": false, "apple": false}
	if s.configuration == nil {
		return result
	}
	for _, provider := range []string{"google", "apple"} {
		cfg, err := s.configuration(ctx, provider)
		result[provider] = err == nil && cfg.Active
	}
	return result
}
