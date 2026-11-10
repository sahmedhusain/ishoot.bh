package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUpdateRef(t *testing.T) {
	oldRef := "#/components/schemas/RecordPaymentRequest"
	newRef := "#/components/schemas/CommerceRecordPaymentRequest"

	// Map with $ref
	m := map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"payment": map[string]interface{}{
				"$ref": oldRef,
			},
			"other": map[string]interface{}{
				"$ref": "#/components/schemas/Unrelated",
			},
		},
		"items": []interface{}{
			map[string]interface{}{
				"$ref": oldRef,
			},
		},
	}

	updateRef(m, oldRef, newRef)

	props := m["properties"].(map[string]interface{})
	payment := props["payment"].(map[string]interface{})
	assert.Equal(t, newRef, payment["$ref"])

	other := props["other"].(map[string]interface{})
	assert.Equal(t, "#/components/schemas/Unrelated", other["$ref"])

	items := m["items"].([]interface{})
	item0 := items[0].(map[string]interface{})
	assert.Equal(t, newRef, item0["$ref"])
}
