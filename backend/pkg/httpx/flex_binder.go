package httpx

import (
	"bytes"
	"encoding/json"
	"io"
	"reflect"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
)

var (
	pgNumericType = reflect.TypeOf(pgtype.Numeric{})
	pgDateType    = reflect.TypeOf(pgtype.Date{})
	timeType      = reflect.TypeOf(time.Time{})

	rfc8259NumberRE = regexp.MustCompile(`^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$`)
	looseDecimalRE  = regexp.MustCompile(`^([+-]?)(?:(\d+)(?:\.(\d+))?|\.(\d+))(?:([eE][+-]?\d+))?$`)

	structFieldsCache sync.Map // reflect.Type -> *structFieldMap
)

type structFieldMap struct {
	exact map[string]reflect.Type
	lower map[string]reflect.Type
}

// flexJSONBinder wraps Echo's DefaultBinder to accept JSON string decimals for
// pgtype.Numeric, RFC3339 timestamps for pgtype.Date, and YYYY-MM-DD dates for
// time.Time without changing invalid-input 400 semantics.
type flexJSONBinder struct {
	base echo.DefaultBinder
}

func (b *flexJSONBinder) Bind(i any, c echo.Context) error {
	req := c.Request()
	if req.Body != nil && isJSONContentType(req.Header.Get(echo.HeaderContentType)) {
		raw, err := io.ReadAll(req.Body)
		if err != nil {
			return err
		}
		if len(bytes.TrimSpace(raw)) > 0 && i != nil {
			if normalized, ok := normalizeJSONForTarget(raw, reflect.TypeOf(i)); ok {
				req.Body = io.NopCloser(bytes.NewReader(normalized))
				req.ContentLength = int64(len(normalized))
			} else {
				req.Body = io.NopCloser(bytes.NewReader(raw))
				req.ContentLength = int64(len(raw))
			}
		} else {
			req.Body = io.NopCloser(bytes.NewReader(raw))
			req.ContentLength = int64(len(raw))
		}
	}
	return b.base.Bind(i, c)
}

func isJSONContentType(ct string) bool {
	ct = strings.ToLower(strings.TrimSpace(ct))
	if idx := strings.IndexByte(ct, ';'); idx >= 0 {
		ct = strings.TrimSpace(ct[:idx])
	}
	return ct == echo.MIMEApplicationJSON || strings.HasSuffix(ct, "+json")
}

func normalizeJSONForTarget(raw []byte, targetType reflect.Type) ([]byte, bool) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var val any
	if err := dec.Decode(&val); err != nil {
		return nil, false
	}
	normalized, changed := normalizeValue(val, targetType)
	if !changed {
		return nil, false
	}
	out, err := json.Marshal(normalized)
	if err != nil {
		return nil, false
	}
	return out, true
}

func derefType(t reflect.Type) reflect.Type {
	for t != nil && t.Kind() == reflect.Pointer {
		t = t.Elem()
	}
	return t
}

func normalizeValue(val any, t reflect.Type) (any, bool) {
	if val == nil || t == nil {
		return val, false
	}
	t = derefType(t)
	if t == nil {
		return val, false
	}

	switch t {
	case pgNumericType:
		s, ok := val.(string)
		if !ok {
			return val, false
		}
		trimmed := strings.TrimSpace(s)
		if trimmed == "" {
			return nil, true
		}
		if num, ok := normalizeJSONNumber(trimmed); ok {
			return num, true
		}
		// Leave non-numeric strings (e.g. "abc") intact so unmarshaling still returns 400.
		return val, false

	case pgDateType:
		s, ok := val.(string)
		if !ok {
			return val, false
		}
		trimmed := strings.TrimSpace(s)
		if trimmed == "" {
			return nil, true
		}
		if len(trimmed) > 10 {
			if _, err := time.Parse(time.RFC3339Nano, trimmed); err == nil {
				return trimmed[:10], true
			}
		}
		return val, false

	case timeType:
		s, ok := val.(string)
		if !ok {
			return val, false
		}
		trimmed := strings.TrimSpace(s)
		if trimmed == "" {
			return nil, true
		}
		if len(trimmed) == 10 {
			if _, err := time.Parse("2006-01-02", trimmed); err == nil {
				return trimmed + "T00:00:00Z", true
			}
		}
		return val, false
	}

	switch t.Kind() {
	case reflect.Struct:
		m, ok := val.(map[string]any)
		if !ok {
			return val, false
		}
		fields := getStructFields(t)
		changed := false
		for k, elem := range m {
			ft := fields.lookup(k)
			if ft == nil {
				continue
			}
			newElem, elemChanged := normalizeValue(elem, ft)
			if elemChanged {
				m[k] = newElem
				changed = true
			}
		}
		return m, changed

	case reflect.Slice, reflect.Array:
		arr, ok := val.([]any)
		if !ok {
			return val, false
		}
		elemType := t.Elem()
		changed := false
		for idx, elem := range arr {
			newElem, elemChanged := normalizeValue(elem, elemType)
			if elemChanged {
				arr[idx] = newElem
				changed = true
			}
		}
		return arr, changed

	case reflect.Map:
		m, ok := val.(map[string]any)
		if !ok {
			return val, false
		}
		elemType := t.Elem()
		changed := false
		for k, elem := range m {
			newElem, elemChanged := normalizeValue(elem, elemType)
			if elemChanged {
				m[k] = newElem
				changed = true
			}
		}
		return m, changed
	}

	return val, false
}

func normalizeJSONNumber(s string) (json.Number, bool) {
	if rfc8259NumberRE.MatchString(s) {
		return json.Number(s), true
	}
	m := looseDecimalRE.FindStringSubmatch(s)
	if m == nil {
		return "", false
	}
	sign := m[1]
	if sign == "+" {
		sign = ""
	}
	intPart := m[2]
	fracPart := m[3]
	if m[4] != "" {
		intPart = "0"
		fracPart = m[4]
	}
	expPart := m[5]

	intPart = strings.TrimLeft(intPart, "0")
	if intPart == "" {
		intPart = "0"
	}

	var buf strings.Builder
	buf.WriteString(sign)
	buf.WriteString(intPart)
	if fracPart != "" {
		buf.WriteByte('.')
		buf.WriteString(fracPart)
	}
	buf.WriteString(expPart)
	candidate := buf.String()
	if !rfc8259NumberRE.MatchString(candidate) {
		return "", false
	}
	return json.Number(candidate), true
}

func getStructFields(t reflect.Type) *structFieldMap {
	if cached, ok := structFieldsCache.Load(t); ok {
		return cached.(*structFieldMap)
	}
	fm := &structFieldMap{
		exact: make(map[string]reflect.Type),
		lower: make(map[string]reflect.Type),
	}
	collectStructFields(t, fm, map[reflect.Type]bool{})
	structFieldsCache.Store(t, fm)
	return fm
}

func collectStructFields(t reflect.Type, fm *structFieldMap, visited map[reflect.Type]bool) {
	t = derefType(t)
	if t == nil || t.Kind() != reflect.Struct || visited[t] {
		return
	}
	visited[t] = true

	// Record direct exported fields before promoted anonymous fields so outer fields win.
	var embedded []reflect.Type
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		if !f.IsExported() {
			if f.Anonymous {
				ft := derefType(f.Type)
				if ft != nil && ft.Kind() == reflect.Struct {
					embedded = append(embedded, ft)
				}
			}
			continue
		}
		tag := f.Tag.Get("json")
		if tag == "-" {
			continue
		}
		name, _, hasComma := strings.Cut(tag, ",")
		if f.Anonymous && name == "" && !hasComma {
			ft := derefType(f.Type)
			if ft != nil && ft.Kind() == reflect.Struct {
				embedded = append(embedded, ft)
				continue
			}
		}
		if name == "" {
			name = f.Name
		}
		if _, exists := fm.exact[name]; !exists {
			fm.exact[name] = f.Type
		}
		lk := strings.ToLower(name)
		if _, exists := fm.lower[lk]; !exists {
			fm.lower[lk] = f.Type
		}
	}
	for _, et := range embedded {
		collectStructFields(et, fm, visited)
	}
}

func (m *structFieldMap) lookup(key string) reflect.Type {
	if ft, ok := m.exact[key]; ok {
		return ft
	}
	return m.lower[strings.ToLower(key)]
}
