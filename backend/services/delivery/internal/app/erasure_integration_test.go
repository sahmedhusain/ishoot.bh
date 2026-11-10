package app_test
import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/delivery/internal/app"
	"platform.local/backend/services/delivery/internal/postgres"
	"platform.local/backend/services/delivery/migrations"
)
type fakePrivateFileDeleter struct {
	deleted	[]string
	err	error
}
func (f *fakePrivateFileDeleter) DeletePrivate(_ context.Context, fileURL string) error {
	if f.err != nil {
		return f.err
	}
	f.deleted = append(f.deleted, fileURL)
	return nil
}
func open(t *testing.T) (context.Context, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{Schema: postgres.Schema, Migrations: migrations.FS, Logger: slog.New(slog.NewTextHandler(io.Discard, nil))}))
	return ctx, pool
}
func TestCustomerErasedScrubsShipments(t *testing.T) {
	ctx, pool := open(t)
	_, err := pool.Exec(ctx, `INSERT INTO delivery.shipment (id, number, order_id, promised_by, recipient_name, recipient_phone, address, tracking_token, proof_signature, proof_photo_url)
		VALUES ('s1', 'S1', 'o1', now(), 'Ann Lee', '+100', '{"line1":"1 Main St"}', 't1', 'sig', '/api/files/general/proof-1.pdf'),
		       ('s2', 'S2', 'o2', now(), 'Bob Ray', '+200', '{"line1":"2 Side St"}', 't2', 'sig', '/api/files/general/shared.pdf'),
		       ('s3', 'S3', 'o1', now(), 'Ann Lee', '+100', '{"line1":"1 Main St"}', 't3', 'sig', '/api/files/general/shared.pdf')`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO delivery.shipment_event (id, shipment_id, status, note) VALUES ('e1', 's1', 'pending', 'gate code 1234'), ('e2', 's2', 'pending', 'keep')`)
	require.NoError(t, err)
	svc := app.New(postgres.New(pool))
	files := &fakePrivateFileDeleter{}
	svc.SetPrivateFileDeleter(files)
	const id = "6f1c1d0e-0000-4000-8000-000000000011"
	payload := []byte(`{"customerId":"c1","orderIds":["o1"],"contactIds":[]}`)
	require.NoError(t, svc.HandleCustomerErased(ctx, id, payload))
	require.NoError(t, svc.HandleCustomerErased(ctx, id, payload), "redelivery")
	require.NoError(t, svc.HandleCustomerErased(ctx, "6f1c1d0e-0000-4000-8000-000000000012", []byte(`oops`)))
	require.NoError(t, svc.HandleCustomerErased(ctx, "6f1c1d0e-0000-4000-8000-000000000013", []byte(`{"orderIds":[]}`)))
	require.Equal(t, []string{"/api/files/general/proof-1.pdf"}, files.deleted, "shared private assets remain while a shipment still references them")
	var name, phone string
	var sig *string
	var addr string
	require.NoError(t, pool.QueryRow(ctx, `SELECT recipient_name, recipient_phone, proof_signature, address::text FROM delivery.shipment WHERE id='s1'`).Scan(&name, &phone, &sig, &addr))
	require.Equal(t, "Erased customer", name)
	require.Empty(t, phone)
	require.Nil(t, sig)
	require.JSONEq(t, `{}`, addr)
	var note *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT note FROM delivery.shipment_event WHERE id='e1'`).Scan(&note))
	require.Nil(t, note)
	require.NoError(t, pool.QueryRow(ctx, `SELECT recipient_name FROM delivery.shipment WHERE id='s2'`).Scan(&name))
	require.Equal(t, "Bob Ray", name, "other customers keep their data")
	var photo *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT proof_photo_url FROM delivery.shipment WHERE id='s2'`).Scan(&photo))
	require.Equal(t, "/api/files/general/shared.pdf", *photo)
	require.NoError(t, pool.QueryRow(ctx, `SELECT proof_photo_url FROM delivery.shipment WHERE id='s3'`).Scan(&photo))
	require.Nil(t, photo)
	require.NoError(t, pool.QueryRow(ctx, `SELECT note FROM delivery.shipment_event WHERE id='e2'`).Scan(&note))
	require.Equal(t, "keep", *note)
}
func TestCustomerErasureRetriesWhenPrivateFileDeletionFails(t *testing.T) {
	ctx, pool := open(t)
	_, err := pool.Exec(ctx, `INSERT INTO delivery.shipment (id, number, order_id, promised_by, recipient_name, tracking_token, proof_photo_url)
		VALUES ('s1', 'S1', 'o1', now(), 'Ann Lee', 't1', '/api/files/general/proof-1.pdf')`)
	require.NoError(t, err)
	svc := app.New(postgres.New(pool))
	svc.SetPrivateFileDeleter(&fakePrivateFileDeleter{err: errors.New("files unavailable")})
	err = svc.HandleCustomerErased(ctx, "6f1c1d0e-0000-4000-8000-000000000014", []byte(`{"orderIds":["o1"]}`))
	require.Error(t, err)
	var name string
	require.NoError(t, pool.QueryRow(ctx, `SELECT recipient_name FROM delivery.shipment WHERE id='s1'`).Scan(&name))
	require.Equal(t, "Ann Lee", name, "failed deletion leaves the event unhandled and personal data available for retry")
}
