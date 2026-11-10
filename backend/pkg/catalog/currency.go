package catalog
import "strings"
type Currency struct {
	Code		string	`json:"code"`
	MinorUnits	*int	`json:"minorUnits"`
}
var Currencies []Currency
func init()	{ must(decode("currencies.json", &Currencies)) }
func CurrencyDecimals(code string) (int, bool) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "XXX" || code == "XTS" {
		return 0, false
	}
	for _, currency := range Currencies {
		if currency.Code == code {
			if currency.MinorUnits == nil {
				return 2, true
			}
			return *currency.MinorUnits, true
		}
	}
	return 0, false
}
