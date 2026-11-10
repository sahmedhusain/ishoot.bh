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
type Config struct {
	Endpoint	string		`env:"ENDPOINT" validate:"required,url"`
	Region		string		`env:"REGION" envDefault:"us-east-1" validate:"required"`
	AccessKeyID	string		`env:"ACCESS_KEY_ID" validate:"required"`
	SecretAccessKey	string		`env:"SECRET_ACCESS_KEY" validate:"required"`
	UsePathStyle	bool		`env:"USE_PATH_STYLE" envDefault:"true"`
	Timeout		time.Duration	`env:"TIMEOUT" envDefault:"30s" validate:"gt=0"`
}
var ErrNotFound = errors.New("objectstore: object not found")
type Info struct {
	Size		int64
	ContentType	string
}
type Store interface {
	Put(ctx context.Context, bucket, key string, body io.Reader, size int64, contentType string) error
	Get(ctx context.Context, bucket, key string) (io.ReadCloser, Info, error)
	GetRange(ctx context.Context, bucket, key string, n int64) ([]byte, error)
	Head(ctx context.Context, bucket, key string) (Info, error)
	Delete(ctx context.Context, bucket, key string) error
}
type S3 struct{ client *s3.Client }
func New(cfg Config) *S3 {
	client := s3.New(s3.Options{
		BaseEndpoint:	aws.String(cfg.Endpoint),
		Region:		cfg.Region,
		Credentials:	credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		UsePathStyle:	cfg.UsePathStyle,
		HTTPClient:	&http.Client{Timeout: cfg.Timeout, Transport: telemetry.Transport(nil)},
		RequestChecksumCalculation:	aws.RequestChecksumCalculationWhenRequired,
		ResponseChecksumValidation:	aws.ResponseChecksumValidationWhenRequired,
	})
	return &S3{client: client}
}
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
func (s *S3) Put(ctx context.Context, bucket, key string, body io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:		aws.String(bucket),
		Key:		aws.String(key),
		Body:		body,
		ContentLength:	aws.Int64(size),
		ContentType:	aws.String(contentType),
	}, streamingBody)
	if err != nil {
		return fmt.Errorf("objectstore: put %s/%s: %w", bucket, key, err)
	}
	return nil
}
func streamingBody(o *s3.Options) {
	o.APIOptions = append(o.APIOptions, v4.SwapComputePayloadSHA256ForUnsignedPayloadMiddleware)
}
func (s *S3) Get(ctx context.Context, bucket, key string) (io.ReadCloser, Info, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(bucket), Key: aws.String(key)})
	if err != nil {
		return nil, Info{}, wrap(err, "get", bucket, key)
	}
	return out.Body, Info{Size: aws.ToInt64(out.ContentLength), ContentType: aws.ToString(out.ContentType)}, nil
}
func (s *S3) GetRange(ctx context.Context, bucket, key string, n int64) ([]byte, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket:	aws.String(bucket), Key: aws.String(key), Range: aws.String(fmt.Sprintf("bytes=0-%d", n-1)),
	})
	if err != nil {
		return nil, wrap(err, "get", bucket, key)
	}
	defer out.Body.Close()
	return io.ReadAll(io.LimitReader(out.Body, n))
}
func (s *S3) Head(ctx context.Context, bucket, key string) (Info, error) {
	out, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{Bucket: aws.String(bucket), Key: aws.String(key)})
	if err != nil {
		return Info{}, wrap(err, "head", bucket, key)
	}
	return Info{Size: aws.ToInt64(out.ContentLength), ContentType: aws.ToString(out.ContentType)}, nil
}
func (s *S3) Delete(ctx context.Context, bucket, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(bucket), Key: aws.String(key)})
	if err != nil && !errors.Is(wrap(err, "delete", bucket, key), ErrNotFound) {
		return fmt.Errorf("objectstore: delete %s/%s: %w", bucket, key, err)
	}
	return nil
}
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
