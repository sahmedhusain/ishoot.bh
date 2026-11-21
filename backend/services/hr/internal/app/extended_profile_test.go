package app_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/services/hr/internal/postgres"
	"platform.local/backend/services/hr/internal/postgres/sqlcdb"
)

func TestEmployeeExtendedProfileRoundTripAndNullableEmail(t *testing.T) {
	svc, _ := setup(t)
	ctx := context.Background()

	// 1. Two non-portal field employees with empty email should both succeed (partial unique index).
	e1, err := svc.CreateEmployee(ctx, sqlcdb.CreateEmployeeParams{
		FirstNameEn: "Jassim",
		LastNameEn:  "Al-Dossary",
		FirstNameAr: "جاسم",
		LastNameAr:  "الدوسري",
		Email:       "",
		JobTitleEn:  "Fleet Driver",
		JobTitleAr:  "سائق توصيل",
		HireDate:           date(time.Now()),
		Status:             "active",
		BasicSalary:        num("420.000"),
		HousingAllowance:   num("0.000"),
		TransportAllowance: num("0.000"),
		OtherAllowances:    num("0.000"),
	})
	require.NoError(t, err)

	e2, err := svc.CreateEmployee(ctx, sqlcdb.CreateEmployeeParams{
		FirstNameEn:        "Mahdi",
		LastNameEn:         "Al-Saffar",
		FirstNameAr:        "مهدي",
		LastNameAr:         "الصفار",
		Email:              "",
		JobTitleEn:         "Warehouse Technician",
		JobTitleAr:         "فني مستودع",
		HireDate:           date(time.Now()),
		Status:             "active",
		BasicSalary:        num("460.000"),
		HousingAllowance:   num("0.000"),
		TransportAllowance: num("0.000"),
		OtherAllowances:    num("0.000"),
	})
	require.NoError(t, err)
	assert.NotEqual(t, e1.ID, e2.ID)

	// 2. Save extended profile (contacts, emails, emergency contacts, health record, WPS bank details).
	loc := "Seef Tower HQ"
	prob := "2027-03-01"
	marital := "married"
	bank := "National Bank of Bahrain (NBB)"
	iban := "BH67NBOB00000099123456"
	notes := "Completed safety induction."

	saved, err := svc.SaveEmployeeExtendedProfile(ctx, e1.ID, postgres.EmployeeExtendedProfile{
		Contacts: json.RawMessage(`[
			{"id":"ct-1","type":"mobile","value":"+97339001122","isPrimary":true},
			{"id":"ct-2","type":"whatsapp","value":"+97339001122","label":"Dispatch","isPrimary":false}
		]`),
		Emails: json.RawMessage(`[
			{"id":"em-1","type":"work","value":"jassim@zayedgroup.bh","isPrimary":true,"syncToAccount":true},
			{"id":"em-2","type":"personal","value":"jassim.home@gmail.com","isPrimary":false,"syncToAccount":false}
		]`),
		EmergencyContacts: json.RawMessage(`[
			{"id":"ec-1","name":"Mohammed Al-Dossary","relationship":"sibling","phone":"+97336112233","isPrimary":true}
		]`),
		HealthRecord: json.RawMessage(`{
			"bloodType":"O+",
			"fitnessStatus":"fit",
			"insuranceProvider":"Solidarity Bahrain",
			"insurancePolicyNumber":"SOL-9910"
		}`),
		WorkLocation:     &loc,
		ProbationEndDate: &prob,
		MaritalStatus:    &marital,
		BankName:         &bank,
		IBAN:             &iban,
		HrNotes:          &notes,
	})
	require.NoError(t, err)

	fetched, err := svc.GetEmployeeExtendedProfile(ctx, e1.ID)
	require.NoError(t, err)
	assert.Equal(t, saved.WorkLocation, fetched.WorkLocation)
	assert.Equal(t, "Seef Tower HQ", *fetched.WorkLocation)
	assert.Equal(t, "2027-03-01", *fetched.ProbationEndDate)
	assert.Equal(t, "married", *fetched.MaritalStatus)
	assert.Equal(t, "National Bank of Bahrain (NBB)", *fetched.BankName)
	assert.Equal(t, "BH67NBOB00000099123456", *fetched.IBAN)
	assert.Equal(t, "Completed safety induction.", *fetched.HrNotes)
	assert.Contains(t, string(fetched.Contacts), `"whatsapp"`)
	assert.Contains(t, string(fetched.Emails), `"syncToAccount": true`)
	assert.Contains(t, string(fetched.EmergencyContacts), `"Mohammed Al-Dossary"`)
	assert.Contains(t, string(fetched.HealthRecord), `"Solidarity Bahrain"`)
}
