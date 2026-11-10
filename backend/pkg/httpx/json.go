package httpx
import (
	"encoding/json"
	"io"
)
func encodeJSON(w io.Writer, v any) error {
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(true)
	return enc.Encode(v)
}
