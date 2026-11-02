# hr service

Human resources management: organizational departments, employee records, leave management, attendance tracking, and payroll processing.
Owns the `hr` schema: `department`, `employee`, `leave_request`, `attendance_entry`, `payroll_run`, `payroll_item`, and `outbox`.
The HTTP contract is [api/openapi.yaml](api/openapi.yaml); typed client functions live in `@platform/api-client`.

## Responsibilities

- **Organizational Structure**: Department hierarchies, managers, and employee assignments.
- **Employee Directory**: Personal details, residency and work documents, job titles, and status.
- **Leave Management**: Leave requests, balances, approvals, and return-to-work processing.
- **Attendance**: Daily check-in/out records, timesheets, and overtime tracking.
- **Payroll**: Monthly payroll runs, allowances, deductions, social insurance (GOSI), and payslips.
- **Outbox Events**: Emits `hr.employee.created.v1`, `hr.leave.approved.v1`, `hr.payroll.processed.v1`, `hr.offboarding.completed.v1`.

## Endpoints

| Path | Caller | Authorization |
|---|---|---|
| `GET /v1/hr/departments` | Admin app | `departments:read` |
| `POST /v1/hr/departments` | Admin app | `departments:edit` |
| `GET /v1/hr/employees` | Admin app | `employees:read` |
| `POST /v1/hr/employees` | Admin app | `employees:edit` |
| `GET /v1/hr/leaves` | Admin app | `leave:read` |
| `POST /v1/hr/leaves` | Admin app | `leave:edit` |
| `GET /v1/hr/attendance` | Admin app | `attendance:read` |
| `POST /v1/hr/attendance` | Admin app | `attendance:edit` |
| `GET /v1/hr/payroll` | Admin app | `payroll:read` |
| `POST /v1/hr/payroll` | Admin app | `payroll:edit` |

## Running

The service binary supports `serve`, `worker`, `migrate`, and `healthcheck`.
- Public API on `:8080` (behind gateway route `/v1/hr/`)
- Admin listener on `:9090` (`/livez`, `/readyz`, `/metrics`)
