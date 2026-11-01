package httpx

import (
	"context"
	"errors"
	"net/http"

	"golang.org/x/sync/errgroup"

	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/logx"
)

// Servers builds the public and admin http.Servers from the shared settings.
func Servers(cfg config.Common, public, admin http.Handler) (*http.Server, *http.Server) {
	build := func(addr string, handler http.Handler) *http.Server {
		return &http.Server{
			Addr:              addr,
			Handler:           handler,
			ReadHeaderTimeout: cfg.HTTP.ReadHeaderTimeout,
			ReadTimeout:       cfg.HTTP.ReadTimeout,
			WriteTimeout:      cfg.HTTP.WriteTimeout,
			IdleTimeout:       cfg.HTTP.IdleTimeout,
		}
	}
	return build(cfg.HTTP.Addr, public), build(cfg.Admin.Addr, admin)
}

// Run serves until ctx is cancelled (normally by SIGTERM), then drains in-flight requests for up to the configured
// shutdown timeout.
func Run(ctx context.Context, cfg config.Common, logger *logx.Logger, servers ...*http.Server) error {
	group, groupCtx := errgroup.WithContext(ctx)
	for _, srv := range servers {
		group.Go(func() error {
			logger.Info("listening", "addr", srv.Addr)
			if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
				return err
			}
			return nil
		})
	}
	group.Go(func() error {
		<-groupCtx.Done()
		logger.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), cfg.HTTP.ShutdownTimeout)
		defer cancel()
		var errs []error
		for _, srv := range servers {
			errs = append(errs, srv.Shutdown(shutdownCtx))
		}
		return errors.Join(errs...)
	})
	return group.Wait()
}
