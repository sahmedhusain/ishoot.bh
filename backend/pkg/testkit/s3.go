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
const SeaweedFSImage = "chrislusf/seaweedfs:4.51"
type S3Server struct {
	Endpoint, AccessKeyID, SecretAccessKey string
}
func S3(t testing.TB) S3Server {
	t.Helper()
	if testing.Short() {
		t.Skip("integration test: needs Docker")
	}
	ctx := context.Background()
	server := S3Server{AccessKeyID: "testkit", SecretAccessKey: "testkit-secret"}
	req := testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:	SeaweedFSImage,
			Cmd:	[]string{"server", "-s3", "-dir=/data", "-master.volumeSizeLimitMB=64"},
			Env: map[string]string{
				"AWS_ACCESS_KEY_ID":		server.AccessKeyID,
				"AWS_SECRET_ACCESS_KEY":	server.SecretAccessKey,
			},
			ExposedPorts:	[]string{"8333/tcp"},
			WaitingFor: wait.ForHTTP("/healthz").WithPort("8333/tcp").
				WithStatusCodeMatcher(func(int) bool { return true }).WithStartupTimeout(time.Minute),
		},
		Started:	true,
	}
	container, err := testcontainers.GenericContainer(ctx, req)
	if err != nil {
		t.Fatalf("testkit: starting seaweedfs: %v", err)
	}
	t.Cleanup(func() { _ = container.Terminate(ctx) })
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
func warmUp(t testing.TB, server S3Server) {
	t.Helper()
	store := objectstore.New(objectstore.Config{
		Endpoint:	server.Endpoint, Region: "us-east-1", AccessKeyID: server.AccessKeyID,
		SecretAccessKey:	server.SecretAccessKey, UsePathStyle: true, Timeout: 30 * time.Second,
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
