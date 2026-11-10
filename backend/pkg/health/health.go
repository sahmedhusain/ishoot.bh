package health
import (
	"context"
	"sort"
	"sync"
	"time"
)
const (
	StatusUp	= "up"
	StatusDown	= "down"
)
type Check func(ctx context.Context) error
type Result struct {
	Status		string	`json:"status"`
	Error		string	`json:"error,omitempty"`
	DurationMS	float64	`json:"durationMs"`
}
type Report struct {
	Status	string			`json:"status"`
	Service	string			`json:"service"`
	Version	string			`json:"version"`
	Checks	map[string]Result	`json:"checks"`
}
type Checker struct {
	service, version	string
	timeout			time.Duration
	mu			sync.RWMutex
	checks			map[string]Check
}
func NewChecker(service, version string, timeout time.Duration) *Checker {
	return &Checker{service: service, version: version, timeout: timeout, checks: map[string]Check{}}
}
func (c *Checker) Register(name string, check Check) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.checks[name] = check
}
func (c *Checker) Names() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	names := make([]string, 0, len(c.checks))
	for name := range c.checks {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}
func (c *Checker) Run(ctx context.Context) Report {
	c.mu.RLock()
	checks := make(map[string]Check, len(c.checks))
	for name, check := range c.checks {
		checks[name] = check
	}
	c.mu.RUnlock()
	report := Report{Status: StatusUp, Service: c.service, Version: c.version, Checks: make(map[string]Result, len(checks))}
	var mu sync.Mutex
	var wg sync.WaitGroup
	for name, check := range checks {
		wg.Add(1)
		go func() {
			defer wg.Done()
			result := c.runOne(ctx, check)
			mu.Lock()
			defer mu.Unlock()
			report.Checks[name] = result
			if result.Status == StatusDown {
				report.Status = StatusDown
			}
		}()
	}
	wg.Wait()
	return report
}
func (c *Checker) runOne(ctx context.Context, check Check) (result Result) {
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()
	start := time.Now()
	defer func() {
		result.DurationMS = float64(time.Since(start).Microseconds()) / 1000
		if r := recover(); r != nil {
			result.Status, result.Error = StatusDown, "check panicked"
		}
	}()
	if err := check(ctx); err != nil {
		return Result{Status: StatusDown, Error: err.Error()}
	}
	if ctx.Err() != nil {
		return Result{Status: StatusDown, Error: ctx.Err().Error()}
	}
	return Result{Status: StatusUp}
}
