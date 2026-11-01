package httpx

import (
	"strconv"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
)

// Metrics holds a service's Prometheus registry and the standard HTTP instruments.
type Metrics struct {
	Registry *prometheus.Registry
	requests *prometheus.CounterVec
	duration *prometheus.HistogramVec
	inFlight prometheus.Gauge
}

// NewMetrics registers the Go runtime, process and HTTP metrics for one service.
func NewMetrics(service string) *Metrics {
	registry := prometheus.NewRegistry()
	labels := prometheus.Labels{"service": service}
	m := &Metrics{
		Registry: registry,
		requests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "http_requests_total", Help: "HTTP requests handled.", ConstLabels: labels,
		}, []string{"method", "route", "status"}),
		duration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name: "http_request_duration_seconds", Help: "HTTP request latency.", ConstLabels: labels,
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "route"}),
		inFlight: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "http_requests_in_flight", Help: "HTTP requests being handled.", ConstLabels: labels,
		}),
	}
	registry.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
		m.requests, m.duration, m.inFlight,
	)
	return m
}

// Middleware records every request by route template, method and status.
func (m *Metrics) Middleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			m.inFlight.Inc()
			defer m.inFlight.Dec()
			start := time.Now()
			err := next(c)
			if err != nil {
				c.Error(err)
			}
			route := routeOf(c)
			method := c.Request().Method
			m.requests.WithLabelValues(method, route, strconv.Itoa(c.Response().Status)).Inc()
			m.duration.WithLabelValues(method, route).Observe(time.Since(start).Seconds())
			return nil
		}
	}
}
