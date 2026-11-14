package app_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"platform.local/backend/services/workflow/internal/postgres"
)

func TestWorkflowDocumentRelationsIntegration(t *testing.T) {
	ctx := context.Background()
	svc, _ := setupWorkflowPostgres(t)

	// Contracts linked across contact, deal, project, quotation, invoice, employee, department, document.
	savedContract, err := svc.SaveContractRelational(ctx, postgres.ContractRecord{
		Title:        "Annual Media Retainer",
		ContractType: "retainer",
		ContactID:    wfPtr("client-42"),
		DealID:       wfPtr("deal-42"),
		ProjectID:    wfPtr("proj-42"),
		QuotationID:  wfPtr("quot-42"),
		InvoiceID:    wfPtr("inv-42"),
		EmployeeID:   wfPtr("emp-42"),
		DepartmentID: wfPtr("dept-42"),
		DocumentID:   wfPtr("doc-contract-42"),
		Status:       "active",
		Value:        "2500.000",
		Currency:     "BHD",
	})
	require.NoError(t, err)
	require.NotEmpty(t, savedContract.ID)
	require.NotEmpty(t, savedContract.ContractNumber)

	fetched, err := svc.GetContractRelational(ctx, savedContract.ID)
	require.NoError(t, err)
	require.Equal(t, "Annual Media Retainer", fetched.Title)
	require.NotNil(t, fetched.QuotationID)
	require.Equal(t, "quot-42", *fetched.QuotationID)

	byClient, err := svc.ListContractsFiltered(ctx, postgres.ContractFilter{
		ContactID: "client-42",
		Status:    "active",
	})
	require.NoError(t, err)
	require.Len(t, byClient, 1)

	byDeal, err := svc.ListContractsFiltered(ctx, postgres.ContractFilter{
		DealID: "deal-42",
	})
	require.NoError(t, err)
	require.Len(t, byDeal, 1)

	// Official letter linked to client, deal, project, document.
	letter, err := svc.CreateOfficialLetterRelational(ctx, postgres.OfficialLetterRelational{
		RecipientName: "Fatima Al-Mansoor",
		Subject:       "Project Handover Letter",
		Body:          "Confirmation of deliverables.",
		Status:        "draft",
		ClientID:      wfPtr("client-42"),
		DealID:        wfPtr("deal-42"),
		ProjectID:     wfPtr("proj-42"),
		DocumentID:    wfPtr("doc-letter-42"),
	})
	require.NoError(t, err)
	require.NotEmpty(t, letter.ID)

	letters, err := svc.ListOfficialLettersFiltered(ctx, postgres.RelationFilter{
		ClientID: "client-42",
		DealID:   "deal-42",
	})
	require.NoError(t, err)
	require.Len(t, letters, 1)
	require.Equal(t, letter.ID, letters[0].ID)

	require.NoError(t, svc.DeleteContractRelational(ctx, savedContract.ID))
	afterDelete, err := svc.ListContractsFiltered(ctx, postgres.ContractFilter{ContactID: "client-42"})
	require.NoError(t, err)
	require.Empty(t, afterDelete)
}
