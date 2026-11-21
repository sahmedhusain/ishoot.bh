package app_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/services/identity/internal/app"
)

func TestStaffDraftAndDeskAccountUsernameSerialization(t *testing.T) {
	draft := app.StaffDraft{
		DisplayName: "Nasser Al-Doseri",
		Email:       "nasser@zayedgroup.bh",
		Username:    "nasser.sales",
		Role:        "sales",
	}
	raw, err := json.Marshal(draft)
	require.NoError(t, err)
	assert.Contains(t, string(raw), `"username":"nasser.sales"`)

	var decoded app.StaffDeskAccount
	err = json.Unmarshal([]byte(`{"id":"u-1","email":"nasser@zayedgroup.bh","username":"nasser.sales","displayName":"Nasser Al-Doseri","roles":["sales"],"active":true}`), &decoded)
	require.NoError(t, err)
	assert.Equal(t, "nasser.sales", decoded.Username)
	assert.Equal(t, "Nasser Al-Doseri", decoded.DisplayName)
}
