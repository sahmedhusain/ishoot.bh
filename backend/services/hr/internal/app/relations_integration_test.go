package app_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"platform.local/backend/services/hr/internal/postgres"
	"platform.local/backend/services/hr/internal/postgres/sqlcdb"
)

func strPtrHR(s string) *string { return &s }

func TestHRRelationsAndIdentitySyncIntegration(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	dept, err := svc.CreateDepartment(ctx, sqlcdb.CreateDepartmentParams{
		NameEn: "Film Production",
		NameAr: "الإنتاج السينمائي",
		Code:   "PROD",
	})
	require.NoError(t, err)

	now := time.Now().UTC()
	mgr, err := svc.CreateEmployee(ctx, sqlcdb.CreateEmployeeParams{
		EmployeeNumber:     "EMP-MGR",
		FirstNameEn:        "Ali",
		LastNameEn:         "Hasan",
		FirstNameAr:        "علي",
		LastNameAr:         "حسن",
		Email:              "ali@studio.test",
		JobTitleEn:         "Director",
		JobTitleAr:         "مدير",
		DepartmentID:       &dept.ID,
		HireDate:           date(now),
		Status:             "active",
		BasicSalary:        num("1200"),
		HousingAllowance:   num("200"),
		TransportAllowance: num("100"),
		OtherAllowances:    num("0"),
	})
	require.NoError(t, err)

	emp, err := svc.CreateEmployee(ctx, sqlcdb.CreateEmployeeParams{
		EmployeeNumber:     "EMP-002",
		FirstNameEn:        "Noor",
		LastNameEn:         "Salman",
		FirstNameAr:        "نور",
		LastNameAr:         "سلمان",
		Email:              "noor@studio.test",
		JobTitleEn:         "Editor",
		JobTitleAr:         "مونتير",
		DepartmentID:       &dept.ID,
		HireDate:           date(now),
		Status:             "active",
		BasicSalary:        num("800"),
		HousingAllowance:   num("150"),
		TransportAllowance: num("50"),
		OtherAllowances:    num("0"),
	})
	require.NoError(t, err)

	links, err := svc.UpdateEmployeeLinks(ctx, emp.ID, postgres.EmployeeLinksPatch{
		UserID:    strPtrHR("user-noor"),
		ManagerID: &mgr.ID,
	})
	require.NoError(t, err)
	require.NotNil(t, links.UserID)
	require.Equal(t, "user-noor", *links.UserID)
	require.NotNil(t, links.ManagerID)
	require.Equal(t, mgr.ID, *links.ManagerID)

	cred, err := svc.SaveCredential(ctx, postgres.EmployeeCredential{
		EmployeeID: emp.ID,
		Kind:       "cpr",
		Label:      "National CPR",
		Number:     strPtrHR("920101234"),
	})
	require.NoError(t, err)
	require.NotEmpty(t, cred.ID)

	rel, err := svc.GetEmployeeRelations(ctx, emp.ID)
	require.NoError(t, err)
	require.Equal(t, emp.ID, rel.Employee.ID)
	require.NotNil(t, rel.UserID)
	require.Equal(t, "user-noor", *rel.UserID)
	require.NotNil(t, rel.ManagerID)
	require.Equal(t, mgr.ID, *rel.ManagerID)
	require.Len(t, rel.Credentials, 1)
	require.Equal(t, cred.ID, rel.Credentials[0].ID)

	require.NoError(t, svc.DeleteCredential(ctx, cred.ID))
	afterCreds, err := svc.ListCredentials(ctx, emp.ID)
	require.NoError(t, err)
	require.Empty(t, afterCreds)
}
