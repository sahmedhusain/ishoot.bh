package app_test

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"platform.local/backend/pkg/migrate"
	"platform.local/backend/pkg/testkit"
	"platform.local/backend/services/hr/internal/app"
	"platform.local/backend/services/hr/internal/postgres"
	"platform.local/backend/services/hr/internal/postgres/sqlcdb"
	"platform.local/backend/services/hr/migrations"
)

func setup(t *testing.T) (*app.Service, *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testkit.Postgres(t))
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	require.NoError(t, migrate.Run(ctx, pool, migrate.Options{
		Schema:     postgres.Schema,
		Migrations: migrations.FS,
		Logger:     slog.New(slog.NewTextHandler(io.Discard, nil)),
	}))
	return app.New(postgres.New(pool)), pool
}

func num(v string) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(v)
	return n
}

func date(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: true}
}

func TestDepartments(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	// Create
	dept, err := svc.CreateDepartment(ctx, sqlcdb.CreateDepartmentParams{
		NameEn: "Engineering",
		NameAr: "الهندسة",
		Code:   "ENG",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, dept.ID)
	assert.Equal(t, "ENG", dept.Code)

	// Get
	fetched, err := svc.GetDepartment(ctx, dept.ID)
	require.NoError(t, err)
	assert.Equal(t, "Engineering", fetched.NameEn)

	_, err = svc.GetDepartment(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	// List
	list, err := svc.ListDepartments(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 1)

	// Update
	updated, err := svc.UpdateDepartment(ctx, sqlcdb.UpdateDepartmentParams{
		ID:     dept.ID,
		NameEn: "Software Engineering",
		NameAr: "هندسة البرمجيات",
		Code:   "SWE",
	})
	require.NoError(t, err)
	assert.Equal(t, "SWE", updated.Code)

	// Delete
	err = svc.DeleteDepartment(ctx, dept.ID)
	require.NoError(t, err)

	_, err = svc.GetDepartment(ctx, dept.ID)
	assert.ErrorIs(t, err, app.ErrNotFound)
}

func TestEmployeesAndOffboarding(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	dept, err := svc.CreateDepartment(ctx, sqlcdb.CreateDepartmentParams{
		NameEn: "Engineering",
		NameAr: "الهندسة",
		Code:   "ENG",
	})
	require.NoError(t, err)

	now := time.Now().UTC()
	emp, err := svc.CreateEmployee(ctx, sqlcdb.CreateEmployeeParams{
		EmployeeNumber:     "EMP001",
		FirstNameEn:        "John",
		LastNameEn:         "Doe",
		FirstNameAr:        "جون",
		LastNameAr:         "دو",
		Email:              "john.doe@example.com",
		JobTitleEn:         "Developer",
		JobTitleAr:         "مطور",
		DepartmentID:       &dept.ID,
		HireDate:           date(now),
		Status:             "active",
		BasicSalary:        num("5000"),
		HousingAllowance:   num("1000"),
		TransportAllowance: num("500"),
		OtherAllowances:    num("0"),
	})
	require.NoError(t, err)
	assert.NotEmpty(t, emp.ID)
	assert.Equal(t, "john.doe@example.com", emp.Email)

	fetched, err := svc.GetEmployee(ctx, emp.ID)
	require.NoError(t, err)
	assert.Equal(t, "John", fetched.FirstNameEn)

	_, err = svc.GetEmployee(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	list, err := svc.ListEmployees(ctx)
	require.NoError(t, err)
	assert.Len(t, list, 1)

	updated, err := svc.UpdateEmployee(ctx, sqlcdb.UpdateEmployeeParams{
		ID:                 emp.ID,
		FirstNameEn:        "Johnathan",
		LastNameEn:         "Doe",
		FirstNameAr:        "جونثان",
		LastNameAr:         "دو",
		Email:              "johnathan.doe@example.com",
		JobTitleEn:         "Senior Developer",
		JobTitleAr:         "مطور أول",
		DepartmentID:       &dept.ID,
		HireDate:           date(now),
		Status:             "active",
		BasicSalary:        num("6000"),
		HousingAllowance:   num("1200"),
		TransportAllowance: num("500"),
		OtherAllowances:    num("0"),
	})
	require.NoError(t, err)
	assert.Equal(t, "Johnathan", updated.FirstNameEn)

	// Offboard Employee
	offboarded, err := svc.OffboardEmployee(ctx, emp.ID)
	require.NoError(t, err)
	assert.Equal(t, "terminated", offboarded.Status)

	// Delete
	err = svc.DeleteEmployee(ctx, emp.ID)
	require.NoError(t, err)

	_, err = svc.GetEmployee(ctx, emp.ID)
	assert.ErrorIs(t, err, app.ErrNotFound)
}

func TestLeaveRequests(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	now := time.Now().UTC()
	emp, err := svc.CreateEmployee(ctx, sqlcdb.CreateEmployeeParams{
		EmployeeNumber:     "EMP002",
		FirstNameEn:        "Jane",
		LastNameEn:         "Smith",
		FirstNameAr:        "جين",
		LastNameAr:         "سميث",
		Email:              "jane.smith@example.com",
		JobTitleEn:         "Designer",
		JobTitleAr:         "مصممة",
		HireDate:           date(now),
		Status:             "active",
		BasicSalary:        num("4000"),
		HousingAllowance:   num("0"),
		TransportAllowance: num("0"),
		OtherAllowances:    num("0"),
	})
	require.NoError(t, err)

	lr, err := svc.CreateLeaveRequest(ctx, sqlcdb.CreateLeaveRequestParams{
		EmployeeID: emp.ID,
		LeaveType:  "annual",
		StartDate:  date(now),
		EndDate:    date(now.AddDate(0, 0, 5)),
		DaysCount:  num("5"),
		Status:     "pending",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, lr.ID)

	fetched, err := svc.GetLeaveRequest(ctx, lr.ID)
	require.NoError(t, err)
	assert.Equal(t, "pending", fetched.Status)

	_, err = svc.GetLeaveRequest(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	// List all vs List by employee
	all, err := svc.ListLeaveRequests(ctx, nil)
	require.NoError(t, err)
	assert.Len(t, all, 1)

	empID := emp.ID
	byEmp, err := svc.ListLeaveRequests(ctx, &empID)
	require.NoError(t, err)
	assert.Len(t, byEmp, 1)

	emptyID := ""
	allEmpty, err := svc.ListLeaveRequests(ctx, &emptyID)
	require.NoError(t, err)
	assert.Len(t, allEmpty, 1)

	// Approve Leave Request
	approved, err := svc.ApproveLeaveRequest(ctx, lr.ID, "manager1")
	require.NoError(t, err)
	assert.Equal(t, "approved", approved.Status)
	require.NotNil(t, approved.ApprovedBy)
	assert.Equal(t, "manager1", *approved.ApprovedBy)
}

func TestAttendance(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	now := time.Now().UTC()
	emp, err := svc.CreateEmployee(ctx, sqlcdb.CreateEmployeeParams{
		EmployeeNumber:     "EMP003",
		FirstNameEn:        "Bob",
		LastNameEn:         "Marley",
		FirstNameAr:        "بوب",
		LastNameAr:         "مارلي",
		Email:              "bob@example.com",
		JobTitleEn:         "Singer",
		JobTitleAr:         "مغني",
		HireDate:           date(now),
		Status:             "active",
		BasicSalary:        num("3000"),
		HousingAllowance:   num("0"),
		TransportAllowance: num("0"),
		OtherAllowances:    num("0"),
	})
	require.NoError(t, err)

	att, err := svc.RecordAttendance(ctx, sqlcdb.RecordAttendanceParams{
		EmployeeID: emp.ID,
		EntryDate:  date(now),
		CheckIn:    &now,
		Status:     "present",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, att.ID)
	assert.Equal(t, "present", att.Status)

	list, err := svc.ListAttendance(ctx, emp.ID)
	require.NoError(t, err)
	assert.Len(t, list, 1)
	assert.Equal(t, att.ID, list[0].ID)
}

func TestPayroll(t *testing.T) {
	ctx := context.Background()
	svc, _ := setup(t)

	now := time.Now().UTC()
	emp, err := svc.CreateEmployee(ctx, sqlcdb.CreateEmployeeParams{
		EmployeeNumber:     "EMP004",
		FirstNameEn:        "Alice",
		LastNameEn:         "Wonderland",
		FirstNameAr:        "أليس",
		LastNameAr:         "واندرلاند",
		Email:              "alice@example.com",
		JobTitleEn:         "Analyst",
		JobTitleAr:         "محلل",
		HireDate:           date(now),
		Status:             "active",
		BasicSalary:        num("7000"),
		HousingAllowance:   num("0"),
		TransportAllowance: num("0"),
		OtherAllowances:    num("0"),
	})
	require.NoError(t, err)

	runWithItems, err := svc.CreatePayrollRun(ctx, sqlcdb.CreatePayrollRunParams{
		PeriodMonth:     11,
		PeriodYear:      2026,
		Status:          "draft",
		TotalGross:      num("7000"),
		TotalDeductions: num("0"),
		TotalNet:        num("7000"),
		Currency:        "BHD",
	}, []sqlcdb.InsertPayrollItemParams{
		{
			EmployeeID:  emp.ID,
			BasicSalary: num("7000"),
			Allowances:  num("0"),
			Deductions:  num("0"),
			NetSalary:   num("7000"),
			Status:      "pending",
		},
	})
	require.NoError(t, err)
	assert.NotEmpty(t, runWithItems.PayrollRun.ID)
	assert.Len(t, runWithItems.Items, 1)
	assert.Equal(t, emp.ID, runWithItems.Items[0].EmployeeID)

	fetched, err := svc.GetPayrollRun(ctx, runWithItems.PayrollRun.ID)
	require.NoError(t, err)
	assert.Equal(t, "draft", fetched.Status)
	assert.Len(t, fetched.Items, 1)

	_, err = svc.GetPayrollRun(ctx, "non-existent")
	assert.ErrorIs(t, err, app.ErrNotFound)

	runs, err := svc.ListPayrollRuns(ctx)
	require.NoError(t, err)
	assert.Len(t, runs, 1)

	processed, err := svc.ProcessPayrollRun(ctx, runWithItems.PayrollRun.ID, "finance_admin")
	require.NoError(t, err)
	assert.Equal(t, "processed", processed.Status)
	require.NotNil(t, processed.ApprovedBy)
	assert.Equal(t, "finance_admin", *processed.ApprovedBy)
}
