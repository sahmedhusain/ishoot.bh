package authn
import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"platform.local/backend/pkg/telemetry"
)
type Config struct {
	Issuer		string		`env:"ISSUER"`
	JWKSURL		string		`env:"JWKS_URL" validate:"omitempty,url"`
	JWKSTTL		time.Duration	`env:"JWKS_TTL" envDefault:"10m" validate:"gt=0"`
	JWKSMinRefresh	time.Duration	`env:"JWKS_MIN_REFRESH" envDefault:"30s" validate:"gt=0"`
	FetchTimeout	time.Duration	`env:"JWKS_FETCH_TIMEOUT" envDefault:"5s" validate:"gt=0"`
	ClockSkew	time.Duration	`env:"CLOCK_SKEW" envDefault:"30s" validate:"gte=0"`
	ServiceKeysFile	string		`env:"SERVICE_KEYS_FILE" validate:"omitempty,file"`
}
func (c Config) Configured() bool {
	return (c.Issuer != "" && c.JWKSURL != "") || c.ServiceKeysFile != ""
}
func NewVerifierFromConfig(c Config) (*Verifier, error) {
	if (c.Issuer == "") != (c.JWKSURL == "") {
		return nil, fmt.Errorf("authn: set both AUTH_ISSUER and AUTH_JWKS_URL, or neither")
	}
	var trusts []Trust
	if c.Issuer != "" {
		client := &http.Client{Timeout: c.FetchTimeout, Transport: telemetry.Transport(nil)}
		trusts = append(trusts, Trust{
			Issuer:	c.Issuer,
			Keys:	NewRemoteKeys(c.JWKSURL, client, c.JWKSTTL, c.JWKSMinRefresh),
			Realms:	UserRealms,
		})
	}
	if c.ServiceKeysFile != "" {
		body, err := os.ReadFile(filepath.Clean(c.ServiceKeysFile))
		if err != nil {
			return nil, fmt.Errorf("authn: reading service keys: %w", err)
		}
		set, err := jwk.Parse(body)
		if err != nil {
			return nil, fmt.Errorf("authn: parsing service keys: %w", err)
		}
		trusts = append(trusts, Trust{Issuer: ServiceIssuerPrefix, Keys: StaticKeys{Set: set}, Realms: []Realm{RealmService}})
	}
	return NewVerifier(c.ClockSkew, trusts...), nil
}
