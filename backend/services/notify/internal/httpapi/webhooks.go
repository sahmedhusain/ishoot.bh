package httpapi

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"platform.local/backend/pkg/problem"
)

type resendWebhookEvent struct {
	Type string `json:"type"`
	Data struct {
		EmailID string `json:"email_id"`
	} `json:"data"`
}

func verifySvixSignature(secret string, id, timestamp string, payload []byte, signatures []string) bool {
	if secret == "" || id == "" || timestamp == "" || len(signatures) == 0 {
		return false
	}
	key := []byte(strings.TrimPrefix(secret, "whsec_"))
	if decoded, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(secret, "whsec_")); err == nil {
		key = decoded
	}

	mac := hmac.New(sha256.New, key)
	fmt.Fprintf(mac, "%s.%s.", id, timestamp)
	mac.Write(payload)
	expectedSig := "v1," + base64.StdEncoding.EncodeToString(mac.Sum(nil))

	for _, sig := range signatures {
		if hmac.Equal([]byte(sig), []byte(expectedSig)) {
			return true
		}
	}
	return false
}

func (h *handler) registerWebhooks(e *echo.Echo) {
	e.POST("/v1/notify/webhooks/resend", func(c echo.Context) error {
		secret := os.Getenv("RESEND_WEBHOOK_SECRET")
		bodyBytes, err := io.ReadAll(io.LimitReader(c.Request().Body, 65536))
		if err != nil {
			return problem.New(http.StatusBadRequest, "invalid_body", "")
		}

		if secret != "" {
			svixID := c.Request().Header.Get("svix-id")
			svixTimestamp := c.Request().Header.Get("svix-timestamp")
			svixSig := c.Request().Header.Get("svix-signature")
			sigs := strings.Split(svixSig, " ")
			if !verifySvixSignature(secret, svixID, svixTimestamp, bodyBytes, sigs) {
				return problem.New(http.StatusUnauthorized, "invalid_signature", "")
			}
		}

		var ev resendWebhookEvent
		if err := json.Unmarshal(bodyBytes, &ev); err != nil {
			return problem.New(http.StatusBadRequest, "invalid_json", "")
		}

		if ev.Data.EmailID != "" {
			// Update message status based on Resend webhook event
			ctx, cancel := context.WithTimeout(c.Request().Context(), 3*time.Second)
			defer cancel()

			var status, lastError string
			switch ev.Type {
			case "email.delivered":
				status = "sent"
			case "email.bounced":
				status = "failed"
				lastError = "Bounced"
			case "email.complained":
				status = "failed"
				lastError = "Spam complaint"
			}

			if status != "" {
				_ = h.svc.UpdateStatusByProviderID(ctx, ev.Data.EmailID, status, lastError)
			}
		}

		return c.JSON(http.StatusOK, map[string]bool{"success": true})
	})
}
