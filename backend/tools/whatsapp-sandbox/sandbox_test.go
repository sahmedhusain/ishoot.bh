package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSandbox(t *testing.T) {
	server := httptest.NewServer(New(2).Handler())
	defer server.Close()
	send := func(token, to string) (int, []byte) {
		body, _ := json.Marshal(map[string]any{"messaging_product": "whatsapp", "to": to, "type": "text", "text": map[string]string{"body": "hi " + to}})
		req, _ := http.NewRequest(http.MethodPost, server.URL+"/v21.0/123/messages", bytes.NewReader(body))
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		resp, err := http.DefaultClient.Do(req)
		require.NoError(t, err)
		defer func() { _ = resp.Body.Close() }()
		raw, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		return resp.StatusCode, raw
	}
	status := func(token, to string) int {
		code, _ := send(token, to)
		return code
	}
	assert.Equal(t, http.StatusUnauthorized, status("", "97333000001"))
	assert.Equal(t, http.StatusInternalServerError, status("t", "97333000500"))
	assert.Equal(t, http.StatusTooManyRequests, status("t", "97333000429"))
	assert.Equal(t, http.StatusBadRequest, status("t", "97333000400"))

	code, raw := send("t", "97333000001")
	require.Equal(t, http.StatusOK, code)
	var accepted struct{ Messages []struct{ ID string } }
	require.NoError(t, json.Unmarshal(raw, &accepted))
	assert.Equal(t, "wamid.sandbox-1", accepted.Messages[0].ID)

	// The next sends fail when asked to; then it works again.
	arm, err := http.Post(server.URL+"/sandbox/fail", "application/json", bytes.NewBufferString(`{"count":1,"status":503}`))
	require.NoError(t, err)
	_ = arm.Body.Close()
	assert.Equal(t, http.StatusNoContent, arm.StatusCode)
	assert.Equal(t, http.StatusServiceUnavailable, status("t", "97333000002"))
	assert.Equal(t, http.StatusOK, status("t", "97333000002"))
	assert.Equal(t, http.StatusOK, status("t", "97333000003"))

	// Inspection keeps the newest messages, filtered by recipient.
	get := func(path string) (int, []byte) {
		resp, err := http.Get(server.URL + path)
		require.NoError(t, err)
		defer func() { _ = resp.Body.Close() }()
		raw, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		return resp.StatusCode, raw
	}
	var got struct{ Items []Message }
	_, raw = get("/sandbox/messages")
	require.NoError(t, json.Unmarshal(raw, &got))
	require.Len(t, got.Items, 2)
	assert.Equal(t, "97333000003", got.Items[0].To)
	_, raw = get("/sandbox/messages?to=97333000002")
	require.NoError(t, json.Unmarshal(raw, &got))
	require.Len(t, got.Items, 1)
	assert.Equal(t, "hi 97333000002", got.Items[0].Body)
	code, _ = get("/")
	assert.Equal(t, http.StatusOK, code)
}
