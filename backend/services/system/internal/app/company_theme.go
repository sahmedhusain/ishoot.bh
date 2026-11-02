package app

import (
	"encoding/json"
	"regexp"
	"slices"
	"strings"
)

type ThemeFontFile struct {
	Weight int    `json:"weight"`
	URL    string `json:"url"`
}
type ThemeFont struct {
	Kind   string          `json:"kind"`
	Family string          `json:"family,omitempty"`
	Files  []ThemeFontFile `json:"files,omitempty"`
}
type BrandTheme struct {
	Primary string `json:"primary"`
	Accent  string `json:"accent"`
	Fonts   struct {
		Body    ThemeFont `json:"body"`
		Heading ThemeFont `json:"heading"`
	} `json:"fonts"`
	Radius        string `json:"radius"`
	DefaultMode   string `json:"defaultMode"`
	ButtonShape   string `json:"buttonShape"`
	FontScale     string `json:"fontScale"`
	HeadingWeight int    `json:"headingWeight"`
	HeadingCase   string `json:"headingCase"`
	Surface       string `json:"surface"`
	WebsiteMode   string `json:"websiteMode"`
}

var themeHex = regexp.MustCompile(`^#[a-fA-F0-9]{6}$`)
var fontFamily = regexp.MustCompile(`^[A-Za-z0-9 ]{1,60}$`)
var brandFontURL = regexp.MustCompile(`^/api/files/brand/[a-zA-Z0-9_-]+\.(woff2?|ttf|otf)$`)

func defaultTheme() BrandTheme {
	out := BrandTheme{Primary: "#1E3A8A", Accent: "#2563EB", Radius: "lg", DefaultMode: "system", ButtonShape: "pill", FontScale: "md", HeadingWeight: 700, HeadingCase: "normal", Surface: "tinted", WebsiteMode: "dark"}
	out.Fonts.Body = ThemeFont{Kind: "google", Family: "IBM Plex Sans Arabic"}
	out.Fonts.Heading = out.Fonts.Body
	return out
}
func validThemeFont(font ThemeFont) (ThemeFont, bool) {
	if font.Kind == "system" {
		return ThemeFont{Kind: "system"}, true
	}
	if !fontFamily.MatchString(font.Family) {
		return ThemeFont{}, false
	}
	if font.Kind == "google" {
		return ThemeFont{Kind: "google", Family: font.Family}, true
	}
	if font.Kind != "upload" {
		return ThemeFont{}, false
	}
	files := []ThemeFontFile{}
	for _, file := range font.Files {
		if brandFontURL.MatchString(file.URL) && file.Weight >= 100 && file.Weight <= 900 {
			files = append(files, file)
			if len(files) == 9 {
				break
			}
		}
	}
	if len(files) == 0 {
		return ThemeFont{}, false
	}
	return ThemeFont{Kind: "upload", Family: font.Family, Files: files}, true
}

func themeValue[T any](values map[string]json.RawMessage, key string, fallback T) T {
	var out T
	if json.Unmarshal(values[key], &out) != nil {
		return fallback
	}
	return out
}
func themeFont(raw json.RawMessage) (ThemeFont, bool) {
	var values map[string]json.RawMessage
	if json.Unmarshal(raw, &values) != nil {
		return ThemeFont{}, false
	}
	font := ThemeFont{Kind: themeValue(values, "kind", ""), Family: themeValue(values, "family", "")}
	if font.Kind == "upload" {
		var files []json.RawMessage
		_ = json.Unmarshal(values["files"], &files)
		for _, raw := range files {
			var file ThemeFontFile
			if json.Unmarshal(raw, &file) == nil {
				font.Files = append(font.Files, file)
			}
		}
	}
	return validThemeFont(font)
}

// Theme normalization preserves the existing renderer's defaults for each omitted or invalid choice.
func normalizeCompanyTheme(raw json.RawMessage) BrandTheme {
	out := defaultTheme()
	var values map[string]json.RawMessage
	if json.Unmarshal(raw, &values) != nil {
		return out
	}
	primary, accent := themeValue(values, "primary", ""), themeValue(values, "accent", "")
	if themeHex.MatchString(primary) {
		out.Primary = strings.ToUpper(primary)
	}
	if themeHex.MatchString(accent) {
		out.Accent = strings.ToUpper(accent)
	}
	var fonts map[string]json.RawMessage
	_ = json.Unmarshal(values["fonts"], &fonts)
	if font, ok := themeFont(fonts["body"]); ok {
		out.Fonts.Body = font
	}
	out.Fonts.Heading = out.Fonts.Body
	if font, ok := themeFont(fonts["heading"]); ok {
		out.Fonts.Heading = font
	}
	radius := themeValue(values, "radius", "")
	if slices.Contains([]string{"none", "sm", "md", "lg", "xl"}, radius) {
		out.Radius = radius
	}
	mode := themeValue(values, "defaultMode", "")
	if slices.Contains([]string{"light", "dark", "system"}, mode) {
		out.DefaultMode = mode
	}
	shape := themeValue(values, "buttonShape", "")
	if slices.Contains([]string{"square", "rounded", "pill"}, shape) {
		out.ButtonShape = shape
	}
	scale := themeValue(values, "fontScale", "")
	if slices.Contains([]string{"sm", "md", "lg"}, scale) {
		out.FontScale = scale
	}
	weight := themeValue(values, "headingWeight", 700)
	if slices.Contains([]int{400, 500, 600, 700, 800}, weight) {
		out.HeadingWeight = weight
	}
	if themeValue(values, "headingCase", "") == "uppercase" {
		out.HeadingCase = "uppercase"
	}
	if themeValue(values, "surface", "") == "neutral" {
		out.Surface = "neutral"
	}
	if themeValue(values, "websiteMode", "") == "light" {
		out.WebsiteMode = "light"
	}
	return out
}
