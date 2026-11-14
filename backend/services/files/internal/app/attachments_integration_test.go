package app

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/files/internal/postgres"
	"platform.local/backend/services/files/migrations"
)

func strPtr(s string) *string { return &s }

func TestEntityAttachmentLifecycleIntegration(t *testing.T) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{
		Schema:     postgres.Schema,
		Migrations: migrations.FS,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))

	svc := New(postgres.New(pool), newMemStore(), Options{
		PublicBucket:  "public",
		PrivateBucket: "private",
		MaxFileSize:   1024 * 1024,
	})

	createdOrderAtt, err := svc.CreateAttachment(ctx, postgres.EntityAttachment{
		FileURL:      "/api/files/general/order-1-receipt.pdf",
		FileName:     "order-1-receipt.pdf",
		FileSize:     2048,
		MIMEType:     "application/pdf",
		EntityType:   "order",
		EntityID:     "ord-100",
		ClientID:     strPtr("cli-1"),
		RelationKind: "order_attachment",
	})
	require.NoError(t, err)
	require.NotEmpty(t, createdOrderAtt.ID)
	require.Equal(t, "order", createdOrderAtt.EntityType)

	createdEmpAtt, err := svc.CreateAttachment(ctx, postgres.EntityAttachment{
		FileURL:      "/api/files/general/emp-1-cpr.pdf",
		FileName:     "emp-1-cpr.pdf",
		FileSize:     1024,
		MIMEType:     "application/pdf",
		EntityType:   "employee",
		EntityID:     "emp-1",
		EmployeeID:   strPtr("emp-1"),
		DocumentID:   strPtr("doc-1"),
		DocumentType: strPtr("cpr"),
	})
	require.NoError(t, err)

	byOrder, err := svc.ListAttachments(ctx, postgres.AttachmentFilter{
		EntityType: "order",
		EntityID:   "ord-100",
	})
	require.NoError(t, err)
	require.Len(t, byOrder, 1)
	require.Equal(t, createdOrderAtt.ID, byOrder[0].ID)

	byClient, err := svc.ListAttachments(ctx, postgres.AttachmentFilter{
		ClientID: "cli-1",
	})
	require.NoError(t, err)
	require.Len(t, byClient, 1)

	byEmp, err := svc.ListAttachments(ctx, postgres.AttachmentFilter{
		EmployeeID: "emp-1",
		DocumentID: "doc-1",
	})
	require.NoError(t, err)
	require.Len(t, byEmp, 1)
	require.Equal(t, createdEmpAtt.ID, byEmp[0].ID)

	require.NoError(t, svc.DeleteAttachment(ctx, createdOrderAtt.ID))
	afterDelete, err := svc.ListAttachments(ctx, postgres.AttachmentFilter{
		EntityType: "order",
		EntityID:   "ord-100",
	})
	require.NoError(t, err)
	require.Empty(t, afterDelete)
}
