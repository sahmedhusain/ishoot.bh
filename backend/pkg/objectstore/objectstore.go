// Package objectstore stores file bytes in S3-compatible object storage (SeaweedFS locally, any S3 provider in
// production). Buckets are private; callers stream bytes through their own service.
package objectstore

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/smithy-go"

	"platform.local/backend/pkg/health"
	"platform.local/backend/pkg/telemetry"
)

// Config is embedded in a service config with envPrefix:"S3_".
type Config struct {
	Endpoint        string        `env:"ENDPOINT" validate:"required,url"`
	Region          string        `env:"REGION" envDefault:"us-east-1" validate:"required"`
	AccessKeyID     string        `env:"ACCESS_KEY_ID" validate:"required"`
	SecretAccessKey string        `env:"SECRET_ACCESS_KEY" validate:"required"`
	UsePathStyle    bool          `env:"USE_PATH_STYLE" envDefault:"true"`
	Timeout         time.Duration `env:"TIMEOUT" envDefault:"30s" validate:"gt=0"`
}

// ErrNotFound is returned when an object does not exist.
var ErrNotFound = errors.New("objectstore: object not found")

// Info describes a stored object.
type Info struct {
	Size        int64
	ContentType string
}

// Store reads and writes objects.
type Store interface {
	Put(ctx context.Context, bucket, key string, body io.Reader, size int64, contentType string) error
	Get(ctx context.Context, bucket, key string) (io.ReadCloser, Info, error)
	// GetRange returns the first n bytes of an object (used to check its real type).
	GetRange(ctx context.Context, bucket, key string, n int64) ([]byte, error)
	Head(ctx context.Context, bucket, key string) (Info, error)
	Delete(ctx context.Context, bucket, key string) error
}

// S3 is a Store backed by an S3 API.
type S3 struct{ client *s3.Client }

// New returns an S3 store.
func New(cfg Config) *S3 {
	client := s3.New(s3.Options{
		BaseEndpoint: aws.String(cfg.Endpoint),
		Region:       cfg.Region,
		Credentials:  credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		UsePathStyle: cfg.UsePathStyle,
		HTTPClient:   &http.Client{Timeout: cfg.Timeout, Transport: telemetry.Transport(nil)},
		// Checksums are only sent when the provider requires them; several S3-compatible servers reject the newer
		// default trailers.
		RequestChecksumCalculation: aws.RequestChecksumCalculationWhenRequired,
		ResponseChecksumValidation: aws.ResponseChecksumValidationWhenRequired,
	})
	return &S3{client: client}
}

// EnsureBucket creates the bucket when it does not exist (development and first installation).
func (s *S3) EnsureBucket(ctx context.Context, bucket string) error {
	if _, err := s.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(bucket)}); err == nil {
		return nil
	}
	_, err := s.client.CreateBucket(ctx, &s3.CreateBucketInput{Bucket: aws.String(bucket)})
	var owned *types.BucketAlreadyOwnedByYou
	if err != nil && !errors.As(err, &owned) {
		return fmt.Errorf("objectstore: creating bucket %s: %w", bucket, err)
	}
	return nil
}

// Put stores an object of a known size.
func (s *S3) Put(ctx context.Context, bucket, key string, body io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(bucket),
		Key:           aws.String(key),
		Body:          body,
		ContentLength: aws.Int64(size),
		ContentType:   aws.String(contentType),
	}, streamingBody)
	if err != nil {
		return fmt.Errorf("objectstore: put %s/%s: %w", bucket, key, err)
	}
	return nil
}

// streamingBody lets Put send a body it cannot rewind (a request being streamed through) without first hashing it:
// the payload is sent unsigned, and its length and type are checked by the caller and by the size header.
func streamingBody(o *s3.Options) {
	o.APIOptions = append(o.APIOptions, v4.SwapComputePayloadSHA256ForUnsignedPayloadMiddleware)
}

// Get opens an object for reading; the caller closes it.
func (s *S3) Get(ctx context.Context, bucket, key string) (io.ReadCloser, Info, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(bucket), Key: aws.String(key)})
	if err != nil {
		return nil, Info{}, wrap(err, "get", bucket, key)
	}
	return out.Body, Info{Size: aws.ToInt64(out.ContentLength), ContentType: aws.ToString(out.ContentType)}, nil
}

// GetRange reads up to n bytes from the start of an object.
func (s *S3) GetRange(ctx context.Context, bucket, key string, n int64) ([]byte, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket), Key: aws.String(key), Range: aws.String(fmt.Sprintf("bytes=0-%d", n-1)),
	})
	if err != nil {
		return nil, wrap(err, "get", bucket, key)
	}
	defer out.Body.Close()
	return io.ReadAll(io.LimitReader(out.Body, n))
}

// Head returns an object's size and type.
func (s *S3) Head(ctx context.Context, bucket, key string) (Info, error) {
	out, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{Bucket: aws.String(bucket), Key: aws.String(key)})
	if err != nil {
		return Info{}, wrap(err, "head", bucket, key)
	}
	return Info{Size: aws.ToInt64(out.ContentLength), ContentType: aws.ToString(out.ContentType)}, nil
}

// Delete removes an object; removing a missing object is not an error.
func (s *S3) Delete(ctx context.Context, bucket, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(bucket), Key: aws.String(key)})
	if err != nil && !errors.Is(wrap(err, "delete", bucket, key), ErrNotFound) {
		return fmt.Errorf("objectstore: delete %s/%s: %w", bucket, key, err)
	}
	return nil
}

// Check is a readiness check: the bucket must be reachable with the configured credentials.
func (s *S3) Check(bucket string) health.Check {
	return func(ctx context.Context) error {
		_, err := s.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(bucket)})
		return err
	}
}

func wrap(err error, op, bucket, key string) error {
	var noKey *types.NoSuchKey
	var notFound *types.NotFound
	var apiErr smithy.APIError
	if errors.As(err, &noKey) || errors.As(err, &notFound) ||
		(errors.As(err, &apiErr) && (apiErr.ErrorCode() == "NoSuchKey" || apiErr.ErrorCode() == "NotFound")) {
		return ErrNotFound
	}
	return fmt.Errorf("objectstore: %s %s/%s: %w", op, bucket, key, err)
}
