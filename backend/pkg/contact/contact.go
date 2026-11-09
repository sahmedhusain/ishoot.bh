// Package contact normalizes the contact fields used by business services.
package contact

import (
	"errors"
	"net/mail"
	"regexp"
	"strings"

	"github.com/nyaruka/phonenumbers"
	"golang.org/x/text/language"
	"golang.org/x/text/language/display"
)

var ErrInvalid = errors.New("invalid contact field")
var phoneInput = regexp.MustCompile(`^[+\p{Nd}\s()./-]+$`)

func Email(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "", nil
	}
	addr, err := mail.ParseAddress(value)
	if err != nil || addr.Address != value || len(value) > 254 {
		return "", ErrInvalid
	}
	return value, nil
}
func Country(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", nil
	}
	upper := strings.ToUpper(value)
	if len(upper) == 2 && phonenumbers.GetCountryCodeForRegion(upper) != 0 {
		return upper, nil
	}
	aliases := map[string]string{"Palestine": "PS", "Hong Kong": "HK", "Macao": "MO", "Falkland Islands (Islas Malvinas)": "FK", "\u0641\u0644\u0633\u0637\u064a\u0646": "PS"}
	if region, ok := aliases[value]; ok {
		return region, nil
	}
	for a := 'A'; a <= 'Z'; a++ {
		for b := 'A'; b <= 'Z'; b++ {
			code := string([]rune{a, b})
			if phonenumbers.GetCountryCodeForRegion(code) == 0 {
				continue
			}
			region, err := language.ParseRegion(code)
			if err != nil {
				continue
			}
			if strings.EqualFold(value, display.English.Regions().Name(region)) || value == display.Arabic.Regions().Name(region) {
				return code, nil
			}
		}
	}
	return "", ErrInvalid
}
func Phone(value, country string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", nil
	}
	if len(value) > 100 || !phoneInput.MatchString(value) {
		return "", ErrInvalid
	}
	region, err := Country(country)
	if err != nil {
		return "", err
	}
	number, err := phonenumbers.Parse(value, region)
	if err != nil || !phonenumbers.IsValidNumber(number) || number.GetExtension() != "" {
		return "", ErrInvalid
	}
	return phonenumbers.Format(number, phonenumbers.E164), nil
}
