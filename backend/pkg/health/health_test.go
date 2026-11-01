package health

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestRunReportsUpWhenEveryCheckPasses(t *testing.T) {
	c := NewChecker("svc", "1", time.Second)
	c.Register("db", func(context.Context) error { return nil })
	c.Register("cache", func(context.Context) error { return nil })

	report := c.Run(context.Background())
	assert.Equal(t, StatusUp, report.Status)
	assert.Equal(t, []string{"cache", "db"}, c.Names())
	assert.Len(t, report.Checks, 2)
}

func TestRunReportsDownOnFailureTimeoutOrPanic(t *testing.T) {
	c := NewChecker("svc", "1", 20*time.Millisecond)
	c.Register("ok", func(context.Context) error { return nil })
	c.Register("failing", func(context.Context) error { return errors.New("refused") })
	c.Register("slow", func(ctx context.Context) error { <-ctx.Done(); return ctx.Err() })
	c.Register("panics", func(context.Context) error { panic("boom") })

	report := c.Run(context.Background())
	assert.Equal(t, StatusDown, report.Status)
	assert.Equal(t, StatusUp, report.Checks["ok"].Status)
	assert.Equal(t, "refused", report.Checks["failing"].Error)
	assert.Equal(t, StatusDown, report.Checks["slow"].Status)
	assert.Equal(t, "check panicked", report.Checks["panics"].Error)
}
