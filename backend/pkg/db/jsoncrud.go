package db

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func toSnake(s string) string {
	var b strings.Builder
	for i, r := range s {
		if unicode.IsUpper(r) {
			if i > 0 {
				b.WriteByte('_')
			}
			b.WriteRune(unicode.ToLower(r))
		} else {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func quoteIdent(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}

func primaryKeyColumn(ctx context.Context, pool *pgxpool.Pool, schema, table string) string {
	var col string
	err := pool.QueryRow(ctx, `
		SELECT a.attname
		FROM pg_index i
		JOIN pg_class c ON c.oid = i.indrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = i.indkey[0]
		WHERE n.nspname = $1 AND c.relname = $2 AND i.indisprimary AND array_length(i.indkey, 1) = 1
		LIMIT 1
	`, schema, table).Scan(&col)
	if err == nil && col != "" {
		return col
	}
	return "id"
}

func ListJSONRows(ctx context.Context, pool *pgxpool.Pool, schema, table string, allowed map[string]bool, orderBy string) (json.RawMessage, error) {
	if !allowed[table] {
		return nil, fmt.Errorf("table %q not allowed", table)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	q := `SELECT COALESCE(json_agg(t`
	if orderBy != "" {
		q += ` ORDER BY ` + orderBy
	}
	q += `), '[]'::json) FROM ` + quoteIdent(schema) + `.` + quoteIdent(table) + ` t`
	var raw []byte
	if err := pool.QueryRow(ctx, q).Scan(&raw); err != nil {
		return nil, err
	}
	if len(raw) == 0 {
		return json.RawMessage(`[]`), nil
	}
	return json.RawMessage(raw), nil
}

func UpsertJSONRow(ctx context.Context, pool *pgxpool.Pool, schema, table string, allowed map[string]bool, rawBody []byte) (json.RawMessage, error) {
	if !allowed[table] {
		return nil, fmt.Errorf("table %q not allowed", table)
	}
	var input map[string]any
	if err := json.Unmarshal(rawBody, &input); err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	rows, err := pool.Query(ctx, `
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = $1 AND table_name = $2
	`, schema, table)
	if err != nil {
		return nil, err
	}
	validCols := map[string]bool{}
	for rows.Next() {
		var col string
		if err := rows.Scan(&col); err == nil {
			validCols[col] = true
		}
	}
	rows.Close()

	normalized := map[string]any{}
	for k, v := range input {
		sn := toSnake(k)
		if validCols[k] {
			normalized[k] = v
		} else if validCols[sn] {
			normalized[sn] = v
		}
	}

	pkCol := primaryKeyColumn(ctx, pool, schema, table)
	pkVal, _ := normalized[pkCol].(string)
	if pkVal != "" {
		var sets []string
		for col := range normalized {
			if col == pkCol {
				continue
			}
			sets = append(sets, quoteIdent(col)+` = rec.`+quoteIdent(col))
		}
		if validCols["updated_at"] {
			if _, ok := normalized["updated_at"]; !ok {
				sets = append(sets, `"updated_at" = now()`)
			}
		}
		if len(sets) > 0 {
			normBytes, err := json.Marshal(normalized)
			if err != nil {
				return nil, err
			}
			q := fmt.Sprintf(
				`UPDATE %s.%s AS t SET %s FROM jsonb_populate_record(NULL::%s.%s, $1::jsonb) AS rec WHERE t.%s = $2 RETURNING row_to_json(t.*)`,
				quoteIdent(schema), quoteIdent(table),
				strings.Join(sets, ", "),
				quoteIdent(schema), quoteIdent(table),
				quoteIdent(pkCol),
			)
			var out []byte
			if err := pool.QueryRow(ctx, q, string(normBytes), pkVal).Scan(&out); err == nil {
				return json.RawMessage(out), nil
			}
		}
	}

	if pkCol == "id" && pkVal == "" && validCols["id"] {
		normalized["id"] = uuid.NewString()
	}
	if validCols["created_at"] {
		if _, ok := normalized["created_at"]; !ok {
			normalized["created_at"] = time.Now().UTC().Format(time.RFC3339Nano)
		}
	}
	if validCols["updated_at"] {
		if _, ok := normalized["updated_at"]; !ok {
			normalized["updated_at"] = time.Now().UTC().Format(time.RFC3339Nano)
		}
	}

	var cols, exprs, conflictSets []string
	for col := range normalized {
		qCol := quoteIdent(col)
		cols = append(cols, qCol)
		exprs = append(exprs, `rec.`+qCol)
		if col != pkCol {
			conflictSets = append(conflictSets, qCol+` = EXCLUDED.`+qCol)
		}
	}
	normBytes, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	onConflict := ""
	if validCols[pkCol] && normalized[pkCol] != nil && len(conflictSets) > 0 {
		onConflict = fmt.Sprintf(` ON CONFLICT (%s) DO UPDATE SET %s`, quoteIdent(pkCol), strings.Join(conflictSets, ", "))
	}
	q := fmt.Sprintf(
		`INSERT INTO %s.%s (%s) SELECT %s FROM jsonb_populate_record(NULL::%s.%s, $1::jsonb) AS rec%s RETURNING row_to_json(%s.%s.*)`,
		quoteIdent(schema), quoteIdent(table),
		strings.Join(cols, ", "),
		strings.Join(exprs, ", "),
		quoteIdent(schema), quoteIdent(table),
		onConflict,
		quoteIdent(schema), quoteIdent(table),
	)
	var out []byte
	if err := pool.QueryRow(ctx, q, string(normBytes)).Scan(&out); err != nil {
		return nil, err
	}
	return json.RawMessage(out), nil
}

func DeleteJSONRow(ctx context.Context, pool *pgxpool.Pool, schema, table string, allowed map[string]bool, id string) error {
	if !allowed[table] {
		return fmt.Errorf("table %q not allowed", table)
	}
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	pkCol := primaryKeyColumn(ctx, pool, schema, table)
	_, err := pool.Exec(ctx, fmt.Sprintf(`DELETE FROM %s.%s WHERE %s = $1`, quoteIdent(schema), quoteIdent(table), quoteIdent(pkCol)), id)
	return err
}
