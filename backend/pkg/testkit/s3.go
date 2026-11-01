package testkit

import (
	"bytes"
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"

	"platform.local/backend/pkg/objectstore"
)

// SeaweedFSImage is the S3 server integration tests run against; keep it in step with docker-compose.yml.
const SeaweedFSImage = "chrislusf/seaweedfs:4.51"

// S3Server describes a disposable S3 server.
type S3Server struct {
	Endpoint, AccessKeyID, SecretAccessKey string
}

// S3 starts a disposable S3 server for the test.
func S3(t testing.TB) S3Server {
	t.Helper()
	if testing.Short() {
		t.Skip("integration test: needs Docker")
	}
	ctx := context.Background()
	server := S3Server{AccessKeyID: "testkit", SecretAccessKey: "testkit-secret"}
	container, err := testcontainers.Run(ctx, SeaweedFSImage,
		testcontainers.WithCmd("server", "-s3", "-dir=/data", "-master.volumeSizeLimitMB=64"),
		testcontainers.WithEnv(map[string]string{
			"AWS_ACCESS_KEY_ID": server.AccessKeyID, "AWS_SECRET_ACCESS_KEY": server.SecretAccessKey,
		}),
		testcontainers.WithExposedPorts("8333/tcp"),
		testcontainers.WithWaitStrategy(wait.ForHTTP("/healthz").WithPort("8333/tcp").
			WithStatusCodeMatcher(func(int) bool { return true }).WithStartupTimeout(time.Minute)),
	)
	if err != nil {
		t.Fatalf("testkit: starting seaweedfs: %v", err)
	}
	t.Cleanup(func() { _ = testcontainers.TerminateContainer(container) })
	host, err := container.Host(ctx)
	if err != nil {
		t.Fatal(err)
	}
	port, err := container.MappedPort(ctx, "8333/tcp")
	if err != nil {
		t.Fatal(err)
	}
	server.Endpoint = fmt.Sprintf("http://%s:%s", host, port.Port())
	warmUp(t, server)
	return server
}

// warmUp waits until the server accepts writes: a fresh SeaweedFS allocates its first volume on the first write,
// which can take longer than a test's request timeout.
func warmUp(t testing.TB, server S3Server) {
	t.Helper()
	store := objectstore.New(objectstore.Config{
		Endpoint: server.Endpoint, Region: "us-east-1", AccessKeyID: server.AccessKeyID,
		SecretAccessKey: server.SecretAccessKey, UsePathStyle: true, Timeout: 30 * time.Second,
	})
	ctx := context.Background()
	deadline := time.Now().Add(2 * time.Minute)
	for {
		err := store.EnsureBucket(ctx, "testkit-warmup")
		if err == nil {
			body := []byte("ready")
			if err = store.Put(ctx, "testkit-warmup", "ready", bytes.NewReader(body), int64(len(body)), "text/plain"); err == nil {
				return
			}
		}
		if time.Now().After(deadline) {
			t.Fatalf("testkit: seaweedfs never accepted writes: %v", err)
		}
		time.Sleep(500 * time.Millisecond)
	}
}
