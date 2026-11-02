package postgres

import (
	"context"
	"platform.local/backend/services/system/internal/postgres/sqlcdb"
	"time"
)

func (s *Store) Company(ctx context.Context, lock bool) (sqlcdb.SystemCompany, error) {
	if lock {
		return s.q.LockCompany(ctx)
	}
	return s.q.Company(ctx)
}
func (s *Store) SaveCompany(ctx context.Context, id string, data []byte, actor string, now time.Time) error {
	return s.q.SaveCompany(ctx, sqlcdb.SaveCompanyParams{ID: id, Data: data, Actor: actor, Now: now})
}
func (s *Store) LockCompanyCurrency(ctx context.Context) error { return s.q.LockCompanyCurrency(ctx) }
func (s *Store) DocumentSequences(ctx context.Context) ([]sqlcdb.SystemDocumentSequence, error) {
	return s.q.DocumentSequences(ctx)
}
func (s *Store) SaveSequence(ctx context.Context, kind, prefix string, next int64) error {
	return s.q.SaveDocumentSequence(ctx, sqlcdb.SaveDocumentSequenceParams{Kind: kind, Prefix: prefix, NextNumber: next})
}
func (s *Store) Assets(ctx context.Context) ([]sqlcdb.SystemCompanyAsset, error) {
	return s.q.CompanyAssets(ctx)
}
func (s *Store) AssetByURL(ctx context.Context, url string) (sqlcdb.SystemCompanyAsset, error) {
	return s.q.CompanyAssetByURL(ctx, url)
}
func (s *Store) SaveAsset(ctx context.Context, in sqlcdb.SaveCompanyAssetParams) error {
	return s.q.SaveCompanyAsset(ctx, in)
}
func (s *Store) DeleteAsset(ctx context.Context, key string) error {
	return s.q.DeleteCompanyAsset(ctx, key)
}
func (s *Store) Reservation(ctx context.Context, caller, key string) (sqlcdb.SystemNumberReservation, error) {
	return s.q.NumberReservation(ctx, sqlcdb.NumberReservationParams{Caller: caller, IdempotencyKey: key})
}
func (s *Store) ReserveSequence(ctx context.Context, kind string) (sqlcdb.ReserveDocumentNumberRow, error) {
	return s.q.ReserveDocumentNumber(ctx, kind)
}
func (s *Store) RecordReservation(ctx context.Context, in sqlcdb.SaveNumberReservationParams) error {
	return s.q.SaveNumberReservation(ctx, in)
}
