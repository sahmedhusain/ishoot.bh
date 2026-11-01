package config

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type serviceConfig struct {
	Common
	Feature string `env:"FEATURE" envDefault:"on" validate:"oneof=on off"`
}

func TestLoadAppliesDefaults(t *testing.T) {
	var cfg serviceConfig
	require.NoError(t, LoadFrom(&cfg, map[string]string{"SERVICE_NAME": "demo"}))
	assert.Equal(t, EnvDevelopment, cfg.AppEnv)
	assert.Equal(t, ":8080", cfg.HTTP.Addr)
	assert.Equal(t, 25*time.Second, cfg.HTTP.RequestTimeout)
	assert.Equal(t, "info", cfg.Log.Level)
	assert.True(t, cfg.IsDevelopment())
	assert.False(t, cfg.IsProduction())
}

func TestLoadReadsPrefixedValues(t *testing.T) {
	var cfg serviceConfig
	require.NoError(t, LoadFrom(&cfg, map[string]string{
		"SERVICE_NAME":         "demo",
		"APP_ENV":              "production",
		"HTTP_ADDR":            ":7000",
		"HTTP_CORS_ORIGINS":    "https://a.example,https://b.example",
		"HTTP_TRUSTED_PROXIES": "10.0.0.0/8",
		"LOG_LEVEL":            "debug",
	}))
	assert.True(t, cfg.IsProduction())
	assert.Equal(t, ":7000", cfg.HTTP.Addr)
	assert.Equal(t, []string{"https://a.example", "https://b.example"}, cfg.HTTP.CORSOrigins)
	assert.Equal(t, "debug", cfg.Log.Level)
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	tests := map[string]map[string]string{
		"missing service name": {},
		"unknown environment":  {"SERVICE_NAME": "demo", "APP_ENV": "qa"},
		"bad log level":        {"SERVICE_NAME": "demo", "LOG_LEVEL": "loud"},
		"bad proxy cidr":       {"SERVICE_NAME": "demo", "HTTP_TRUSTED_PROXIES": "nonsense"},
		"bad service field":    {"SERVICE_NAME": "demo", "FEATURE": "maybe"},
		"bad duration":         {"SERVICE_NAME": "demo", "HTTP_READ_TIMEOUT": "soon"},
	}
	for name, environment := range tests {
		t.Run(name, func(t *testing.T) {
			var cfg serviceConfig
			assert.Error(t, LoadFrom(&cfg, environment))
		})
	}
}
