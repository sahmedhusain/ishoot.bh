package httpx
import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"reflect"
	"strings"
	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"platform.local/backend/pkg/problem"
)
var validate = validator.New(validator.WithRequiredStructEnabled())
func init() {
	validate.RegisterTagNameFunc(func(f reflect.StructField) string {
		name, _, _ := strings.Cut(f.Tag.Get("json"), ",")
		if name == "-" {
			return ""
		}
		return name
	})
}
func BindJSON(c echo.Context, v any, limit int64) error {
	req := c.Request()
	if !strings.HasPrefix(req.Header.Get(echo.HeaderContentType), echo.MIMEApplicationJSON) {
		return problem.New(http.StatusUnsupportedMediaType, problem.CodeBadRequest, "send application/json")
	}
	dec := json.NewDecoder(http.MaxBytesReader(c.Response(), req.Body, limit))
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return problem.New(http.StatusRequestEntityTooLarge, problem.CodeTooLarge, "")
		}
		return problem.BadRequest("invalid JSON body")
	}
	if dec.Decode(&struct{}{}) != io.EOF {
		return problem.BadRequest("one JSON value expected")
	}
	return Validate(v)
}
func Validate(v any) error {
	err := validate.Struct(v)
	var invalid validator.ValidationErrors
	if errors.As(err, &invalid) {
		fields := make([]problem.FieldError, len(invalid))
		for i, fe := range invalid {
			fields[i] = problem.FieldError{Field: fe.Field(), Code: fe.Tag()}
		}
		return problem.Validation(fields...)
	}
	return err
}
