package app_test
import (
	"strings"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"platform.local/backend/services/system/internal/app"
)
func TestNormalizeDomain(t *testing.T) {
	for in, want := range map[string]string{
		"https://Www.Example.com/about":	"www.example.com",
		"example.com.":				"example.com",
		"  shop.example.co.uk  ":		"shop.example.co.uk",
		"example.com?x=1":			"example.com",
		"":					"",
		"localhost":				"",
		"app.localhost":			"",
		"printer.local":			"",
		"127.0.0.1":				"",
		"example.com:8080":			"",
		"user@example.com":			"",
		"-bad.example.com":			"",
		"bad-.example.com":			"",
		"example.c0m":				"",
		"example":				"",
		strings.Repeat("a", 64) + ".com":	"",
	} {
		assert.Equal(t, want, app.NormalizeDomain(in), in)
	}
}
func TestValidateSiteCode(t *testing.T) {
	ok, err := app.ValidateSiteCode(app.SiteCode{GoogleAnalyticsID: " G-ABCD12 ", MetaPixelID: "1234567", TiktokPixelID: "ABCDEFGH12", HeadHTML: "<script></script>"})
	require.NoError(t, err)
	assert.Equal(t, "G-ABCD12", ok.GoogleAnalyticsID)
	assert.Equal(t, "<script></script>", ok.HeadHTML)
	for name, in := range map[string]app.SiteCode{
		"analytics":	{GoogleAnalyticsID: "UA-12345"},
		"meta":		{MetaPixelID: "12ab"},
		"tiktok":	{TiktokPixelID: "lower123"},
		"head":		{HeadHTML: strings.Repeat("x", app.MaxSiteHTML+1)},
		"body":		{BodyHTML: strings.Repeat("ب", app.MaxSiteHTML+1)},
	} {
		_, err := app.ValidateSiteCode(in)
		assert.ErrorIs(t, err, app.ErrValidationFailed, name)
	}
	_, err = app.ValidateSiteCode(app.SiteCode{BodyHTML: strings.Repeat("ب", app.MaxSiteHTML)})
	assert.NoError(t, err, "the limit counts characters, not bytes")
}
