package httpx
import (
	"encoding/json"
	"net/http"
	"net/http/pprof"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/logx"
)
func AdminHandler(cfg config.Common, logger *logx.Logger, checker *health.Checker, metrics *Metrics) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /livez", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": health.StatusUp})
	})
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": health.StatusUp})
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		report := checker.Run(r.Context())
		status := http.StatusOK
		if report.Status != health.StatusUp {
			status = http.StatusServiceUnavailable
		}
		writeJSON(w, status, report)
	})
	mux.HandleFunc("GET /runtime/log-level", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"level": logger.Level().String()})
	})
	mux.HandleFunc("PUT /runtime/log-level", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Level string `json:"level"`
		}
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&body); err != nil || !validLevel(body.Level) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "level must be debug, info, warn or error"})
			return
		}
		logger.SetLevel(body.Level)
		logger.Info("log level changed", "level", body.Level)
		writeJSON(w, http.StatusOK, map[string]string{"level": logger.Level().String()})
	})
	if metrics != nil {
		mux.Handle("GET /metrics", promhttp.HandlerFor(metrics.Registry, promhttp.HandlerOpts{Registry: metrics.Registry}))
	}
	if cfg.Admin.EnableProfile {
		mux.HandleFunc("/debug/pprof/", pprof.Index)
		mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
		mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
		mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
		mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
	}
	return mux
}
func validLevel(level string) bool {
	switch level {
	case "debug", "info", "warn", "error":
		return true
	}
	return false
}
func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = encodeJSON(w, body)
}
