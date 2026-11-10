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
func provisionIT(ctx context.Context, command string, args []string, cfg settings.Login, pool *pgxpool.Pool) error {
	flags := flag.NewFlagSet(command, flag.ContinueOnError)
	email := flags.String("email", "", "e-mail address of the IT account")
	role := flags.String("role", "it_admin", "first-account role (must be it_admin; manage other roles in the IT dashboard)")
	actor := flags.String("actor", "", "operator ID for break-glass recovery (required for recover-it)")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if flags.NArg() != 0 || command == "recover-it" && (*actor == "" || *role != "it_admin") {
		return errors.New("recover-it requires -email and -actor and cannot change account roles")
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
	in := bootstrap.Input{
		Email:	*email, Password: plain, Role: *role, MinPasswordLength: cfg.ITPasswordMinLength,
		RecoveryCount:	cfg.MFARecoveryCount, Issuer: cfg.MFAIssuer, Digits: cfg.TOTP.Digits, Period: cfg.TOTP.Period,
	}
	var result bootstrap.Result
	if command == "recover-it" {
		result, err = bootstrap.RecoverITAdmin(ctx, pool, hasher, ring, in, time.Now().UTC(), *actor)
	} else {
		result, err = bootstrap.CreateITAdmin(ctx, pool, hasher, ring, in, time.Now().UTC())
	}
	if err != nil {
		return err
	}
	fmt.Printf("IT account %s provisioned.\n\nAdd it to an authenticator app (shown once):\n  %s\n  secret: %s\n\nRecovery codes (each works once; store them offline):\n  %s\n",
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
