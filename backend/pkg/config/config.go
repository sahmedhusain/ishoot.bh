// Package config loads a service's settings from environment variables into a typed struct and validates them,
// so a misconfigured service refuses to start instead of failing later.
package config

import (
	"errors"
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/go-playground/validator/v10"
)

// Environment names accepted in APP_ENV.
const (
	EnvDevelopment = "development"
	EnvTest        = "test"
	EnvStaging     = "staging"
	EnvProduction  = "production"
)

// Common holds the settings every service shares. Services embed it in their own Config struct.
type Common struct {
	AppEnv      string    `env:"APP_ENV" envDefault:"development" validate:"oneof=development test staging production"`
	ServiceName string    `env:"SERVICE_NAME" validate:"required"`
	Version     string    `env:"SERVICE_VERSION" envDefault:"dev"`
	Log         Log       `envPrefix:"LOG_"`
	HTTP        HTTP      `envPrefix:"HTTP_"`
	Admin       Admin     `envPrefix:"ADMIN_"`
	Telemetry   Telemetry `envPrefix:"OTEL_"`
}

// Log configures structured logging.
type Log struct {
	Level  string `env:"LEVEL" envDefault:"info" validate:"oneof=debug info warn error"`
	Format string `env:"FORMAT" envDefault:"json" validate:"oneof=json text"`
}

// HTTP configures the public API listener.
type HTTP struct {
	Addr              string        `env:"ADDR" envDefault:":8080" validate:"required"`
	ReadHeaderTimeout time.Duration `env:"READ_HEADER_TIMEOUT" envDefault:"5s" validate:"gt=0"`
	ReadTimeout       time.Duration `env:"READ_TIMEOUT" envDefault:"30s" validate:"gt=0"`
	WriteTimeout      time.Duration `env:"WRITE_TIMEOUT" envDefault:"30s" validate:"gt=0"`
	IdleTimeout       time.Duration `env:"IDLE_TIMEOUT" envDefault:"120s" validate:"gt=0"`
	ShutdownTimeout   time.Duration `env:"SHUTDOWN_TIMEOUT" envDefault:"20s" validate:"gt=0"`
	RequestTimeout    time.Duration `env:"REQUEST_TIMEOUT" envDefault:"25s" validate:"gt=0"`
	BodyLimit         string        `env:"BODY_LIMIT" envDefault:"1M" validate:"required"`
	CORSOrigins       []string      `env:"CORS_ORIGINS" envSeparator:","`
	// TrustedProxies lists the CIDRs whose X-Forwarded-For header is believed when finding the client IP.
	TrustedProxies []string `env:"TRUSTED_PROXIES" envSeparator:"," validate:"dive,cidr"`
}

// Admin configures the internal listener for probes, metrics and (when enabled) profiling. It is never routed
// through the gateway or an ingress.
type Admin struct {
	Addr             string        `env:"ADDR" envDefault:":9090" validate:"required"`
	EnableProfile    bool          `env:"ENABLE_PPROF" envDefault:"false"`
	ReadinessTimeout time.Duration `env:"READINESS_TIMEOUT" envDefault:"2s" validate:"gt=0"`
}

// Telemetry configures OpenTelemetry tracing. An empty endpoint disables export.
type Telemetry struct {
	Endpoint    string  `env:"EXPORTER_OTLP_ENDPOINT"`
	Insecure    bool    `env:"EXPORTER_OTLP_INSECURE" envDefault:"false"`
	SampleRatio float64 `env:"TRACES_SAMPLER_RATIO" envDefault:"1" validate:"gte=0,lte=1"`
}

// IsProduction reports whether the service runs in production.
func (c Common) IsProduction() bool { return c.AppEnv == EnvProduction }

// IsDevelopment reports whether the service runs on a developer machine.
func (c Common) IsDevelopment() bool { return c.AppEnv == EnvDevelopment }

// Load fills cfg (a pointer to a struct) from the environment and validates it.
func Load[T any](cfg *T) error {
	return LoadFrom(cfg, nil)
}

// LoadFrom is Load with an explicit environment, used by tests. A nil map reads the process environment.
func LoadFrom[T any](cfg *T, environment map[string]string) error {
	opts := env.Options{}
	if environment != nil {
		opts.Environment = environment
	}
	if err := env.ParseWithOptions(cfg, opts); err != nil {
		return fmt.Errorf("config: %w", err)
	}
	if err := validate.Struct(cfg); err != nil {
		var invalid validator.ValidationErrors
		if errors.As(err, &invalid) {
			return fmt.Errorf("config: %s", describe(invalid))
		}
		return fmt.Errorf("config: %w", err)
	}
	return nil
}

var validate = validator.New(validator.WithRequiredStructEnabled())

func describe(errs validator.ValidationErrors) string {
	out := ""
	for i, fe := range errs {
		if i > 0 {
			out += "; "
		}
		out += fmt.Sprintf("%s fails %q", fe.Namespace(), fe.Tag())
		if fe.Param() != "" {
			out += fmt.Sprintf(" (%s)", fe.Param())
		}
	}
	return out
}
