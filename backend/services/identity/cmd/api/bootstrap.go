package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/term"

	"platform.local/backend/pkg/password"
	"platform.local/backend/pkg/secrets"
	"platform.local/backend/services/identity/internal/bootstrap"
	"platform.local/backend/services/identity/settings"
)

// bootstrapIT creates the first IT account: `identity bootstrap-it -email it@example.com [-role it_admin]`.
// The password is read from the terminal without echo, or from the first line of standard input when piped.
// The authenticator secret and recovery codes are printed once, to standard output only.
func bootstrapIT(ctx context.Context, args []string, cfg settings.Login, pool *pgxpool.Pool) error {
	flags := flag.NewFlagSet("bootstrap-it", flag.ContinueOnError)
	email := flags.String("email", "", "e-mail address of the first IT administrator")
	role := flags.String("role", "it_admin", "IT role (contracts/catalog/it-access.json)")
	if err := flags.Parse(args); err != nil {
		return err
	}
	hasher, err := password.New(cfg.Password)
	if err != nil {
		return err
	}
	ring, err := secrets.NewKeyring(secrets.Config{Keys: cfg.MFAKeys, PrimaryKeyID: cfg.MFAPrimaryID, LegacyMFAKey: cfg.MFALegacyKey})
	if err != nil {
		return err
	}
	plain, err := readPassword(os.Stdin, os.Stderr)
	if err != nil {
		return err
	}
	result, err := bootstrap.CreateITAdmin(ctx, pool, hasher, ring, bootstrap.Input{
		Email: *email, Password: plain, Role: *role, MinPasswordLength: cfg.ITPasswordMinLength,
		RecoveryCount: cfg.MFARecoveryCount, Issuer: cfg.MFAIssuer, Digits: cfg.TOTP.Digits, Period: cfg.TOTP.Period,
	}, time.Now().UTC())
	if err != nil {
		return err
	}
	fmt.Printf("IT account %s created.\n\nAdd it to an authenticator app (shown once):\n  %s\n  secret: %s\n\nRecovery codes (each works once; store them offline):\n  %s\n",
		result.SubjectID, result.OTPAuthURL, result.Secret, strings.Join(result.RecoveryCodes, "\n  "))
	return nil
}

func readPassword(in *os.File, prompt io.Writer) (string, error) {
	if fd := int(in.Fd()); term.IsTerminal(fd) {
		fmt.Fprint(prompt, "Password: ")
		raw, err := term.ReadPassword(fd)
		fmt.Fprintln(prompt)
		return string(raw), err
	}
	line, err := bufio.NewReader(in).ReadString('\n')
	if err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}
	return strings.TrimRight(line, "\r\n"), nil
}
