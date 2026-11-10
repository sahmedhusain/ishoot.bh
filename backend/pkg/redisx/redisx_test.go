package redisx_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"platform.local/backend/pkg/redisx"
)

func TestOpenInvalidURL(t *testing.T) {
	ctx := context.Background()
	_, err := redisx.Open(ctx, redisx.Config{URL: "invalid-url"})
	assert.Error(t, err)
}
