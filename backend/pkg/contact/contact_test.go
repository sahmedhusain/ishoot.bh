package contact_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/pkg/contact"
)

func TestEmailValidation(t *testing.T) {
	tests := []struct {
		input   string
		expected string
		err     bool
	}{
		{"  Alice@Example.com  ", "alice@example.com", false},
		{"", "", false},
		{"invalid-email", "", true},
		{"user@domain..com", "", true},
	}

	for _, tc := range tests {
		res, err := contact.Email(tc.input)
		if tc.err {
			assert.ErrorIs(t, err, contact.ErrInvalid)
		} else {
			require.NoError(t, err)
			assert.Equal(t, tc.expected, res)
		}
	}
}

func TestCountryValidation(t *testing.T) {
	tests := []struct {
		input   string
		expected string
		err     bool
	}{
		{"BH", "BH", false},
		{"bh", "BH", false},
		{"Bahrain", "BH", false},
		{"فلسطين", "PS", false},
		{"", "", false},
		{"InvalidCountryName123", "", true},
	}

	for _, tc := range tests {
		res, err := contact.Country(tc.input)
		if tc.err {
			assert.ErrorIs(t, err, contact.ErrInvalid)
		} else {
			require.NoError(t, err)
			assert.Equal(t, tc.expected, res)
		}
	}
}

func TestPhoneValidation(t *testing.T) {
	tests := []struct {
		number   string
		country  string
		expected string
		err      bool
	}{
		{"39000000", "BH", "+97339000000", false},
		{"+973 39000000", "BH", "+97339000000", false},
		{"", "BH", "", false},
		{"12345", "BH", "", true},
		{"invalid phone text", "BH", "", true},
	}

	for _, tc := range tests {
		res, err := contact.Phone(tc.number, tc.country)
		if tc.err {
			assert.ErrorIs(t, err, contact.ErrInvalid)
		} else {
			require.NoError(t, err)
			assert.Equal(t, tc.expected, res)
		}
	}
}
