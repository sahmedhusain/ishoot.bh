package httpx
import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/problem"
)
type bindInput struct {
	Name	string	`json:"name" validate:"required,max=5"`
	Count	int	`json:"count" validate:"gte=0"`
}
func bind(body, contentType string) error {
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, contentType)
	c := echo.New().NewContext(req, httptest.NewRecorder())
	var in bindInput
	return BindJSON(c, &in, 64)
}
func TestBindJSON(t *testing.T) {
	require.NoError(t, bind(`{"name":"ok","count":1}`, "application/json; charset=utf-8"))
	tests := map[string]struct {
		body, contentType	string
		status			int
	}{
		"wrong type":		{`{"name":"ok"}`, "text/plain", http.StatusUnsupportedMediaType},
		"unknown field":	{`{"name":"ok","admin":true}`, "application/json", http.StatusBadRequest},
		"two values":		{`{"name":"ok"}{"name":"x"}`, "application/json", http.StatusBadRequest},
		"malformed":		{`{"name":`, "application/json", http.StatusBadRequest},
		"too large":		{`{"name":"` + strings.Repeat("x", 100) + `"}`, "application/json", http.StatusRequestEntityTooLarge},
		"fails its rules":	{`{"name":"toolong","count":-1}`, "application/json", http.StatusUnprocessableEntity},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			p := problem.From(bind(tc.body, tc.contentType))
			assert.Equal(t, tc.status, p.Status)
		})
	}
	p := problem.From(bind(`{"name":"toolong","count":-1}`, "application/json"))
	assert.ElementsMatch(t, []problem.FieldError{{Field: "name", Code: "max"}, {Field: "count", Code: "gte"}}, p.Errors)
}
