package problem
import (
	"errors"
	"fmt"
	"net/http"
	"testing"
	"github.com/stretchr/testify/assert"
)
func TestNewFillsTypeAndTitle(t *testing.T) {
	p := NotFound("ticket")
	assert.Equal(t, http.StatusNotFound, p.Status)
	assert.Equal(t, "Not Found", p.Title)
	assert.Equal(t, TypeBase+CodeNotFound, p.Type)
	assert.Equal(t, "not_found: ticket", p.Error())
}
func TestFromKeepsProblemsAndHidesOtherErrors(t *testing.T) {
	wrapped := fmt.Errorf("loading: %w", Conflict("version"))
	assert.Equal(t, CodeConflict, From(wrapped).Code)
	hidden := From(errors.New("pq: password authentication failed"))
	assert.Equal(t, http.StatusInternalServerError, hidden.Status)
	assert.Empty(t, hidden.Detail)
}
func TestValidationListsFields(t *testing.T) {
	p := Validation(FieldError{Field: "email", Code: "email"})
	assert.Equal(t, http.StatusUnprocessableEntity, p.Status)
	assert.Len(t, p.Errors, 1)
}
