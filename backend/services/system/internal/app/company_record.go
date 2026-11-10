package app
import (
	"encoding/json"
	"time"
)
type CompanyRecord struct {
	WebsitePublished		bool		`json:"websitePublished"`
	ID				string		`json:"id"`
	CompanyNameEn			string		`json:"companyNameEn"`
	CompanyNameAr			string		`json:"companyNameAr"`
	CrNumber			*string		`json:"crNumber"`
	VatId				*string		`json:"vatId"`
	VatEnabled			bool		`json:"vatEnabled"`
	VatPercentage			json.Number	`json:"vatPercentage"`
	VatCertificateUrl		*string		`json:"vatCertificateUrl"`
	DefaultCurrency			string		`json:"defaultCurrency"`
	CurrencyDecimals		int64		`json:"currencyDecimals"`
	AddressEn			*string		`json:"addressEn"`
	AddressAr			*string		`json:"addressAr"`
	Phone				*string		`json:"phone"`
	WhatsappPhone			*string		`json:"whatsappPhone"`
	Email				*string		`json:"email"`
	Website				*string		`json:"website"`
	InstagramUrl			*string		`json:"instagramUrl"`
	LinkedinUrl			*string		`json:"linkedinUrl"`
	YoutubeUrl			*string		`json:"youtubeUrl"`
	BankName			*string		`json:"bankName"`
	BankIban			*string		`json:"bankIban"`
	BankAccountNumber		*string		`json:"bankAccountNumber"`
	BankSwift			*string		`json:"bankSwift"`
	TimeZone			*string		`json:"timeZone"`
	LogoUrl				*string		`json:"logoUrl"`
	DarkLogoUrl			*string		`json:"darkLogoUrl"`
	FullLogoUrl			*string		`json:"fullLogoUrl"`
	DarkFullLogoUrl			*string		`json:"darkFullLogoUrl"`
	IconUrl				*string		`json:"iconUrl"`
	DarkIconUrl			*string		`json:"darkIconUrl"`
	DocumentHeaderUrl		*string		`json:"documentHeaderUrl"`
	DocumentFooterUrl		*string		`json:"documentFooterUrl"`
	StampUrl			*string		`json:"stampUrl"`
	SignatureUrl			*string		`json:"signatureUrl"`
	PaymentTermsDays		int64		`json:"paymentTermsDays"`
	InvoicePrefix			string		`json:"invoicePrefix"`
	InvoiceNextNumber		int64		`json:"invoiceNextNumber"`
	ReceiptPrefix			string		`json:"receiptPrefix"`
	ReceiptNextNumber		int64		`json:"receiptNextNumber"`
	CeoNameEn			*string		`json:"ceoNameEn"`
	CeoNameAr			*string		`json:"ceoNameAr"`
	CeoTitleEn			*string		`json:"ceoTitleEn"`
	CeoTitleAr			*string		`json:"ceoTitleAr"`
	CeoQuoteEn			*string		`json:"ceoQuoteEn"`
	CeoQuoteAr			*string		`json:"ceoQuoteAr"`
	MissionEn			*string		`json:"missionEn"`
	MissionAr			*string		`json:"missionAr"`
	VisionEn			*string		`json:"visionEn"`
	VisionAr			*string		`json:"visionAr"`
	AboutTextEn			*string		`json:"aboutTextEn"`
	AboutTextAr			*string		`json:"aboutTextAr"`
	TermsEn				*string		`json:"termsEn"`
	TermsAr				*string		`json:"termsAr"`
	RulesEn				*string		`json:"rulesEn"`
	RulesAr				*string		`json:"rulesAr"`
	UpdatedAt			time.Time	`json:"updatedAt"`
	DefaultDiscountLimitPercent	json.Number	`json:"defaultDiscountLimitPercent"`
	QuotationsAlwaysNeedApproval	bool		`json:"quotationsAlwaysNeedApproval"`
	Theme				json.RawMessage	`json:"theme"`
	SetupCompletedAt		*time.Time	`json:"setupCompletedAt"`
	ContentLanguages		[]string	`json:"contentLanguages"`
	PrimaryLanguage			string		`json:"primaryLanguage"`
	BusinessActivity		*string		`json:"businessActivity"`
	TaglineEn			*string		`json:"taglineEn"`
	TaglineAr			*string		`json:"taglineAr"`
	FoundedYear			*int64		`json:"foundedYear"`
	City				*string		`json:"city"`
	Country				*string		`json:"country"`
	MapUrl				*string		`json:"mapUrl"`
	CurrencyLocked			bool		`json:"currencyLocked"`
	Revision			int64		`json:"revision"`
}
var companyPatchFields = map[string]bool{
	"companyNameEn":		true,
	"companyNameAr":		true,
	"crNumber":			true,
	"vatId":			true,
	"vatEnabled":			true,
	"vatPercentage":		true,
	"vatCertificateUrl":		true,
	"defaultCurrency":		true,
	"addressEn":			true,
	"addressAr":			true,
	"phone":			true,
	"whatsappPhone":		true,
	"email":			true,
	"website":			true,
	"instagramUrl":			true,
	"linkedinUrl":			true,
	"youtubeUrl":			true,
	"bankName":			true,
	"bankIban":			true,
	"bankAccountNumber":		true,
	"bankSwift":			true,
	"timeZone":			true,
	"logoUrl":			true,
	"darkLogoUrl":			true,
	"fullLogoUrl":			true,
	"darkFullLogoUrl":		true,
	"iconUrl":			true,
	"darkIconUrl":			true,
	"documentHeaderUrl":		true,
	"documentFooterUrl":		true,
	"stampUrl":			true,
	"signatureUrl":			true,
	"paymentTermsDays":		true,
	"invoicePrefix":		true,
	"invoiceNextNumber":		true,
	"receiptPrefix":		true,
	"receiptNextNumber":		true,
	"ceoNameEn":			true,
	"ceoNameAr":			true,
	"ceoTitleEn":			true,
	"ceoTitleAr":			true,
	"ceoQuoteEn":			true,
	"ceoQuoteAr":			true,
	"missionEn":			true,
	"missionAr":			true,
	"visionEn":			true,
	"visionAr":			true,
	"aboutTextEn":			true,
	"aboutTextAr":			true,
	"termsEn":			true,
	"termsAr":			true,
	"rulesEn":			true,
	"rulesAr":			true,
	"defaultDiscountLimitPercent":	true,
	"quotationsAlwaysNeedApproval":	true,
	"theme":			true,
	"contentLanguages":		true,
	"primaryLanguage":		true,
	"businessActivity":		true,
	"taglineEn":			true,
	"taglineAr":			true,
	"foundedYear":			true,
	"city":				true,
	"country":			true,
	"mapUrl":			true,
	"websitePublished":		true,
}
