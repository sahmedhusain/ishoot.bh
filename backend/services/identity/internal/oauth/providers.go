// Package oauth exchanges provider codes and validates their signed identity claims. State and account linking
// belong to identity's transactional use cases; no provider credentials or tokens leave the backend.
package oauth

import (
	"context"
	"crypto/ecdsa"
	"crypto/sha256"
	"crypto/subtle"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/lestrrat-go/jwx/v3/jwa"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/lestrrat-go/jwx/v3/jws"
	"github.com/lestrrat-go/jwx/v3/jwt"

	"platform.local/backend/pkg/authn"
)

var ErrRejected = errors.New("provider sign-in rejected")

type Providers struct {
	client *http.Client
	keys   map[string]authn.KeySource
}

func New() *Providers {
	client := &http.Client{Timeout: 5 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return &Providers{client: client, keys: map[string]authn.KeySource{
		"google": authn.NewRemoteKeys("https://www.googleapis.com/oauth2/v3/certs", client, time.Hour, time.Minute),
		"apple":  authn.NewRemoteKeys("https://appleid.apple.com/auth/keys", client, time.Hour, time.Minute),
	}}
}

func clientID(provider string, values map[string]string) string {
	if provider == "google" {
		return values["clientId"]
	}
	if provider == "apple" {
		return values["serviceId"]
	}
	return ""
}

func AuthorizationURL(provider string, values map[string]string, redirect, state, nonce, verifier, locale string) (string, error) {
	id := clientID(provider, values)
	if id == "" || state == "" || nonce == "" || verifier == "" {
		return "", ErrRejected
	}
	digest := sha256.Sum256([]byte(verifier))
	q := url.Values{"client_id": {id}, "redirect_uri": {redirect}, "response_type": {"code"}, "scope": {"openid email profile"},
		"state": {state}, "nonce": {nonce}, "code_challenge": {base64.RawURLEncoding.EncodeToString(digest[:])}, "code_challenge_method": {"S256"}}
	endpoint := "https://accounts.google.com/o/oauth2/v2/auth"
	if provider == "google" {
		q.Set("prompt", "select_account")
		q.Set("hl", locale)
	} else {
		endpoint = "https://appleid.apple.com/auth/authorize"
		q.Set("response_mode", "form_post")
		q.Set("scope", "name email")
	}
	return endpoint + "?" + q.Encode(), nil
}

type Identity struct {
	Subject       string
	Email         string
	EmailVerified bool
	Name          string
}

func appleSecret(values map[string]string, now time.Time) (string, error) {
	block, _ := pem.Decode([]byte(strings.ReplaceAll(values["privateKey"], `\n`, "\n")))
	if block == nil || values["keyId"] == "" || values["teamId"] == "" || values["serviceId"] == "" {
		return "", ErrRejected
	}
	raw, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return "", ErrRejected
	}
	ec, ok := raw.(*ecdsa.PrivateKey)
	if !ok || ec.Curve.Params().Name != "P-256" {
		return "", ErrRejected
	}
	key, err := jwk.Import(ec)
	if err != nil {
		return "", err
	}
	if err := key.Set(jwk.KeyIDKey, values["keyId"]); err != nil {
		return "", err
	}
	token, err := jwt.NewBuilder().Issuer(values["teamId"]).Subject(values["serviceId"]).Audience([]string{"https://appleid.apple.com"}).IssuedAt(now).Expiration(now.Add(5 * time.Minute)).Build()
	if err != nil {
		return "", err
	}
	signed, err := jwt.Sign(token, jwt.WithKey(jwa.ES256(), key))
	return string(signed), err
}

func (p *Providers) Exchange(ctx context.Context, provider string, values map[string]string, code, verifier, redirect, nonce string) (Identity, error) {
	if (provider != "google" && provider != "apple") || code == "" || len(code) > 8192 || verifier == "" || nonce == "" {
		return Identity{}, ErrRejected
	}
	secret := values["clientSecret"]
	endpoint := "https://oauth2.googleapis.com/token"
	if provider == "apple" {
		var err error
		secret, err = appleSecret(values, time.Now().UTC())
		if err != nil {
			return Identity{}, err
		}
		endpoint = "https://appleid.apple.com/auth/token"
	}
	id := clientID(provider, values)
	if id == "" || secret == "" {
		return Identity{}, ErrRejected
	}
	body := url.Values{"grant_type": {"authorization_code"}, "code": {code}, "client_id": {id}, "client_secret": {secret}, "redirect_uri": {redirect}, "code_verifier": {verifier}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(body.Encode()))
	if err != nil {
		return Identity{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	response, err := p.client.Do(req)
	if err != nil {
		return Identity{}, ErrRejected
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode != http.StatusOK {
		return Identity{}, ErrRejected
	}
	raw, err := io.ReadAll(io.LimitReader(response.Body, (1<<20)+1))
	if err != nil || len(raw) > 1<<20 {
		return Identity{}, ErrRejected
	}
	var result struct {
		IDToken string `json:"id_token"`
	}
	if json.Unmarshal(raw, &result) != nil || len(result.IDToken) > 65536 {
		return Identity{}, ErrRejected
	}
	return p.verify(ctx, provider, result.IDToken, id, nonce)
}

func (p *Providers) verify(ctx context.Context, provider, encoded, audience, nonce string) (Identity, error) {
	message, err := jws.Parse([]byte(encoded))
	if err != nil || len(message.Signatures()) != 1 {
		return Identity{}, ErrRejected
	}
	header := message.Signatures()[0].ProtectedHeaders()
	if header.Algorithm() != jwa.RS256() || header.KeyID() == "" {
		return Identity{}, ErrRejected
	}
	source := p.keys[provider]
	keys, err := source.Keys(ctx)
	if err != nil {
		return Identity{}, ErrRejected
	}
	key, ok := keys.LookupKeyID(header.KeyID())
	if !ok {
		source.Invalidate()
		keys, err = source.Keys(ctx)
		if err != nil {
			return Identity{}, ErrRejected
		}
		key, ok = keys.LookupKeyID(header.KeyID())
		if !ok {
			return Identity{}, ErrRejected
		}
	}
	token, err := jwt.Parse([]byte(encoded), jwt.WithKey(jwa.RS256(), key), jwt.WithValidate(true), jwt.WithAudience(audience), jwt.WithRequiredClaim("exp"), jwt.WithRequiredClaim("sub"))
	if err != nil {
		return Identity{}, ErrRejected
	}
	issuer, _ := token.Issuer()
	if (provider == "google" && issuer != "https://accounts.google.com" && issuer != "accounts.google.com") || (provider == "apple" && issuer != "https://appleid.apple.com") {
		return Identity{}, ErrRejected
	}
	var actualNonce string
	if token.Get("nonce", &actualNonce) != nil || subtle.ConstantTimeCompare([]byte(actualNonce), []byte(nonce)) != 1 {
		return Identity{}, ErrRejected
	}
	aud, _ := token.Audience()
	if len(aud) > 1 {
		var party string
		if token.Get("azp", &party) != nil || party != audience {
			return Identity{}, ErrRejected
		}
	}
	subject, _ := token.Subject()
	if subject == "" || len(subject) > 255 {
		return Identity{}, ErrRejected
	}
	identity := Identity{Subject: subject}
	_ = token.Get("email", &identity.Email)
	_ = token.Get("name", &identity.Name)
	var verified any
	_ = token.Get("email_verified", &verified)
	identity.EmailVerified = verified == true || verified == "true"
	return identity, nil
}
