package postgres

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func (s *Store) Pool() *pgxpool.Pool { return s.pool }

func (s *Store) ListSystemTableJSON(ctx context.Context, table, orderBy string) (json.RawMessage, error) {
	var raw []byte
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	err := s.pool.QueryRow(ctx, `SELECT COALESCE(json_agg(t ORDER BY `+orderBy+`), '[]'::json) FROM system.`+table+` t`).Scan(&raw)
	if err != nil {
		return nil, err
	}
	if len(raw) == 0 {
		return json.RawMessage(`[]`), nil
	}
	return json.RawMessage(raw), nil
}

func (s *Store) SavePublicHoliday(ctx context.Context, id, date, nameEn, nameAr string) (json.RawMessage, error) {
	var raw []byte
	err := s.pool.QueryRow(ctx, `
		INSERT INTO system.public_holiday (id, date, name_en, name_ar)
		VALUES (COALESCE(NULLIF($1,''), gen_random_uuid()::text), $2::date, $3, $4)
		ON CONFLICT (id) DO UPDATE SET date = EXCLUDED.date, name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar
		RETURNING row_to_json(system.public_holiday.*)
	`, id, date, nameEn, nameAr).Scan(&raw)
	return json.RawMessage(raw), err
}

func (s *Store) DeletePublicHoliday(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM system.public_holiday WHERE id = $1`, id)
	return err
}

func (s *Store) SaveHrPolicy(ctx context.Context, rawBody []byte) (json.RawMessage, error) {
	var raw []byte
	err := s.pool.QueryRow(ctx, `
		INSERT INTO system.hr_policy
		SELECT * FROM jsonb_populate_record(NULL::system.hr_policy, $1::jsonb || '{"id":"default"}'::jsonb)
		ON CONFLICT (id) DO UPDATE SET
			salary_timing = COALESCE(EXCLUDED.salary_timing, system.hr_policy.salary_timing),
			pay_day = COALESCE(EXCLUDED.pay_day, system.hr_policy.pay_day),
			attendance_cutoff_day = COALESCE(EXCLUDED.attendance_cutoff_day, system.hr_policy.attendance_cutoff_day),
			workday_hours = COALESCE(EXCLUDED.workday_hours, system.hr_policy.workday_hours),
			workday_start = COALESCE(EXCLUDED.workday_start, system.hr_policy.workday_start),
			daily_rate_basis = COALESCE(EXCLUDED.daily_rate_basis, system.hr_policy.daily_rate_basis),
			deduction_base = COALESCE(EXCLUDED.deduction_base, system.hr_policy.deduction_base),
			overtime_base = COALESCE(EXCLUDED.overtime_base, system.hr_policy.overtime_base),
			overtime_rate = COALESCE(EXCLUDED.overtime_rate, system.hr_policy.overtime_rate),
			overtime_night_rate = COALESCE(EXCLUDED.overtime_night_rate, system.hr_policy.overtime_night_rate),
			overtime_rest_day_rate = COALESCE(EXCLUDED.overtime_rest_day_rate, system.hr_policy.overtime_rest_day_rate),
			overtime_holiday_rate = COALESCE(EXCLUDED.overtime_holiday_rate, system.hr_policy.overtime_holiday_rate),
			late_grace_minutes = COALESCE(EXCLUDED.late_grace_minutes, system.hr_policy.late_grace_minutes),
			deduct_lateness = COALESCE(EXCLUDED.deduct_lateness, system.hr_policy.deduct_lateness),
			unmarked_days = COALESCE(EXCLUDED.unmarked_days, system.hr_policy.unmarked_days),
			prorate_joiners = COALESCE(EXCLUDED.prorate_joiners, system.hr_policy.prorate_joiners),
			commission_in_payroll = COALESCE(EXCLUDED.commission_in_payroll, system.hr_policy.commission_in_payroll),
			gratuity_rules = COALESCE(EXCLUDED.gratuity_rules, system.hr_policy.gratuity_rules)
		RETURNING row_to_json(system.hr_policy.*)
	`, string(rawBody)).Scan(&raw)
	return json.RawMessage(raw), err
}
