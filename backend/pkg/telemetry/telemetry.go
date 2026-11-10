package telemetry
import (
	"context"
	"log/slog"
	"net/http"
	"github.com/labstack/echo/v4"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.opentelemetry.io/otel/trace"
	"platform.local/backend/pkg/config"
	"platform.local/backend/pkg/logx"
)
func Setup(ctx context.Context, cfg config.Common) (func(context.Context) error, error) {
	res, err := resource.Merge(resource.Default(), resource.NewWithAttributes(semconv.SchemaURL,
		semconv.ServiceName(cfg.ServiceName),
		semconv.ServiceVersion(cfg.Version),
		attribute.String("deployment.environment", cfg.AppEnv),
	))
	if err != nil {
		return nil, err
	}
	options := []sdktrace.TracerProviderOption{
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(cfg.Telemetry.SampleRatio))),
	}
	if cfg.Telemetry.Endpoint != "" {
		exporterOptions := []otlptracehttp.Option{otlptracehttp.WithEndpointURL(cfg.Telemetry.Endpoint)}
		if cfg.Telemetry.Insecure {
			exporterOptions = append(exporterOptions, otlptracehttp.WithInsecure())
		}
		exporter, err := otlptracehttp.New(ctx, exporterOptions...)
		if err != nil {
			return nil, err
		}
		options = append(options, sdktrace.WithBatcher(exporter))
	}
	provider := sdktrace.NewTracerProvider(options...)
	otel.SetTracerProvider(provider)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))
	return provider.Shutdown, nil
}
func Handler(service string, next http.Handler) http.Handler {
	return otelhttp.NewHandler(next, service, otelhttp.WithSpanNameFormatter(func(_ string, r *http.Request) string {
		return r.Method
	}))
}
func EchoMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ctx := c.Request().Context()
			span := trace.SpanFromContext(ctx)
			if sc := span.SpanContext(); sc.IsValid() {
				ctx = logx.WithAttrs(ctx, slog.String("trace_id", sc.TraceID().String()))
				c.SetRequest(c.Request().WithContext(ctx))
			}
			err := next(c)
			if route := c.Path(); route != "" {
				span.SetName(c.Request().Method + " " + route)
				span.SetAttributes(semconv.HTTPRoute(route))
			}
			return err
		}
	}
}
func Transport(base http.RoundTripper) http.RoundTripper {
	if base == nil {
		base = http.DefaultTransport
	}
	return otelhttp.NewTransport(base)
}
