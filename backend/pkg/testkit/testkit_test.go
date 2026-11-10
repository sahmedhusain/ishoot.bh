package testkit_test

import (
	"testing"

	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/testkit"
)

func TestPostgresImageConstant(t *testing.T) {
	require.NotEmpty(t, testkit.PostgresImage)
	require.Contains(t, testkit.PostgresImage, "postgres")
}

func TestSeaweedFSImageConstant(t *testing.T) {
	require.NotEmpty(t, testkit.SeaweedFSImage)
	require.Contains(t, testkit.SeaweedFSImage, "seaweedfs")
}

func TestPostgresHelper(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping in short mode")
	}
	_ = testkit.Postgres
}

func TestS3Helper(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping in short mode")
	}
	_ = testkit.S3
}
