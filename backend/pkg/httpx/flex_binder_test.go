package httpx

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type binderEmbeddedBase struct {
	BaseAmount pgtype.Numeric `json:"baseAmount"`
}

type binderLineItem struct {
	Quantity  pgtype.Numeric  `json:"quantity"`
	UnitPrice *pgtype.Numeric `json:"unitPrice"`
}

type binderSampleInput struct {
	binderEmbeddedBase
	ID         string           `param:"id"`
	Value      pgtype.Numeric   `json:"value"`
	Optional   *pgtype.Numeric  `json:"optional"`
	IssueDate  pgtype.Date      `json:"issueDate"`
	EmptyDate  pgtype.Date      `json:"emptyDate"`
	ValidUntil time.Time        `json:"validUntil"`
	ExpiresAt  *time.Time       `json:"expiresAt"`
	Items      []binderLineItem `json:"items"`
}

func TestFlexJSONBinder(t *testing.T) {
	e := echo.New()
	e.Binder = &flexJSONBinder{}

	t.Run("accepts string decimals, empty strings, ISO timestamps for pgtype.Date, and YYYY-MM-DD for time.Time", func(t *testing.T) {
		body := `{
			"baseAmount": "120.500",
			"value": "500.000",
			"optional": "",
			"issueDate": "2026-11-19T17:02:00.000Z",
			"emptyDate": "",
			"validUntil": "2026-12-31",
			"expiresAt": "",
			"items": [
				{"quantity": ".5", "unitPrice": "0042.250"},
				{"quantity": 2, "unitPrice": "-10.5"}
			]
		}`
		req := httptest.NewRequest(http.MethodPost, "/items/abc-1", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSONCharsetUTF8)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues("abc-1")

		var out binderSampleInput
		require.NoError(t, c.Bind(&out))

		assert.Equal(t, "abc-1", out.ID)
		assert.True(t, out.BaseAmount.Valid)
		vBase, err := out.BaseAmount.Float64Value()
		require.NoError(t, err)
		assert.InDelta(t, 120.5, vBase.Float64, 1e-6)

		assert.True(t, out.Value.Valid)
		vVal, err := out.Value.Float64Value()
		require.NoError(t, err)
		assert.InDelta(t, 500.0, vVal.Float64, 1e-6)

		if out.Optional != nil {
			assert.False(t, out.Optional.Valid)
		}

		assert.True(t, out.IssueDate.Valid)
		assert.Equal(t, "2026-11-19", out.IssueDate.Time.Format("2006-01-02"))
		assert.False(t, out.EmptyDate.Valid)

		assert.Equal(t, "2026-12-31T00:00:00Z", out.ValidUntil.UTC().Format(time.RFC3339))
		assert.Nil(t, out.ExpiresAt)

		require.Len(t, out.Items, 2)
		q0, err := out.Items[0].Quantity.Float64Value()
		require.NoError(t, err)
		assert.InDelta(t, 0.5, q0.Float64, 1e-6)
		require.NotNil(t, out.Items[0].UnitPrice)
		p0, err := out.Items[0].UnitPrice.Float64Value()
		require.NoError(t, err)
		assert.InDelta(t, 42.25, p0.Float64, 1e-6)

		q1, err := out.Items[1].Quantity.Float64Value()
		require.NoError(t, err)
		assert.InDelta(t, 2.0, q1.Float64, 1e-6)
		p1, err := out.Items[1].UnitPrice.Float64Value()
		require.NoError(t, err)
		assert.InDelta(t, -10.5, p1.Float64, 1e-6)
	})

	t.Run("rejects non-numeric strings for pgtype.Numeric", func(t *testing.T) {
		body := `{"value": "not-a-number"}`
		req := httptest.NewRequest(http.MethodPost, "/items", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		var out binderSampleInput
		err := c.Bind(&out)
		require.Error(t, err)
		var httpErr *echo.HTTPError
		require.ErrorAs(t, err, &httpErr)
		assert.Equal(t, http.StatusBadRequest, httpErr.Code)
	})

	t.Run("preserves 400 on malformed JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/items", bytes.NewBufferString(`{"value": `))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		var out binderSampleInput
		err := c.Bind(&out)
		require.Error(t, err)
	})
}
