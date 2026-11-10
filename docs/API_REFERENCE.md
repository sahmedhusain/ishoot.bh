# Platform API & Contract Reference

Complete API reference covering Go backend microservice OpenAPI specifications, Next.js route handlers, and typed server actions across `apps/web`, `apps/admin`, and `apps/it`.

---

## 1. Go Microservice OpenAPI Specifications

All Go microservice APIs are specified in OpenAPI 3.1 contracts under `backend/services/<service>/api/openapi.yaml` and consolidated into `docs/api/combined-openapi.yaml`.

| Service | Schema | OpenAPI Contract File | Public Endpoint Base |
|---|---|---|---|
| **identity** | `identity` | [backend/services/identity/api/openapi.yaml](../backend/services/identity/api/openapi.yaml) | `/v1/identity/*` |
| **system** | `system` | [backend/services/system/api/openapi.yaml](../backend/services/system/api/openapi.yaml) | `/v1/system/*` |
| **files** | `files` | [backend/services/files/api/openapi.yaml](../backend/services/files/api/openapi.yaml) | `/v1/files/*` |
| **notify** | `notify` | [backend/services/notify/api/openapi.yaml](../backend/services/notify/api/openapi.yaml) | `/v1/notify/*` |
| **realtime** | `realtime` | [backend/services/realtime/api/openapi.yaml](../backend/services/realtime/api/openapi.yaml) | `/v1/realtime/*` |
| **audit** | `audit` | [backend/services/audit/api/openapi.yaml](../backend/services/audit/api/openapi.yaml) | `/v1/audit/*` |
| **itsm** | `itsm` | [backend/services/itsm/api/openapi.yaml](../backend/services/itsm/api/openapi.yaml) | `/v1/itsm/*` |
| **cms** | `cms` | [backend/services/cms/api/openapi.yaml](../backend/services/cms/api/openapi.yaml) | `/v1/cms/*` |
| **sales** | `sales` | [backend/services/sales/api/openapi.yaml](../backend/services/sales/api/openapi.yaml) | `/v1/sales/*` |
| **finance** | `finance` | [backend/services/finance/api/openapi.yaml](../backend/services/finance/api/openapi.yaml) | `/v1/finance/*` |
| **workflow** | `workflow` | [backend/services/workflow/api/openapi.yaml](../backend/services/workflow/api/openapi.yaml) | `/v1/workflow/*` |
| **hr** | `hr` | [backend/services/hr/api/openapi.yaml](../backend/services/hr/api/openapi.yaml) | `/v1/hr/*` |
| **inventory** | `inventory` | [backend/services/inventory/api/openapi.yaml](../backend/services/inventory/api/openapi.yaml) | `/v1/inventory/*` |
| **commerce** | `commerce` | [backend/services/commerce/api/openapi.yaml](../backend/services/commerce/api/openapi.yaml) | `/v1/commerce/*` |
| **delivery** | `delivery` | [backend/services/delivery/api/openapi.yaml](../backend/services/delivery/api/openapi.yaml) | `/v1/delivery/*` |
| **gateway** | *(Proxy)* | [backend/services/gateway/api/openapi.yaml](../backend/services/gateway/api/openapi.yaml) | `/v1/*` |

---

## 2. Web Application Routes (`apps/web`)

| Route Path | HTTP Methods | Access Level | Description |
|---|---|---|---|
| `/api/account/login` | POST | Public | Authenticates customer account credentials or OTP code. |
| `/api/account/google/callback` | GET | Public | OAuth 2.0 PKCE callback handler for Google Sign-In. |
| `/api/account/apple/callback` | POST | Public | OAuth callback handler for Apple ID Sign-In. |
| `/api/account/orders/[id]` | GET | Customer | Retrieves customer order DTO and fulfillment history. |
| `/api/store/checkout` | POST | Public/Customer | Validates cart, reserves stock, applies coupons, creates order. |
| `/api/store/payment/return` | GET/POST | Public | Verification handler for customer return from payment gateway. |
| `/api/store/payment/webhook/[gateway]` | POST | Webhook | Verified webhook handler for async gateway notifications. |
| `/api/inquiry` | POST | Public | Submits lead inquiry contact form data to CRM pipeline. |
| `/api/revalidate` | POST | Secret | Revalidates ISR pages when CMS content is published. |
| `/api/health` | GET | Public | Application healthcheck probe and installation fingerprint. |

---

## 3. Admin Application Routes (`apps/admin`)

| Route Path | HTTP Methods | Authorization | Description |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Staff authentication endpoint issuing JWT session cookies. |
| `/api/auth/me` | GET | Signed-In | Retrieves active staff profile, permissions, and roles. |
| `/api/auth/mfa` | POST | Signed-In | Verifies or configures staff TOTP multi-factor authentication. |
| `/api/documents/[id]/pdf` | GET | `invoices:read` | Renders bilingual invoice / quotation PDF document. |
| `/api/hr/documents/[id]/pdf` | GET | `payroll:read` | Renders employee payslip or salary certificate PDF. |
| `/api/calendar/feed` | GET | `calendar:read` | iCal calendar feed export (`.ics`). |
| `/api/reports/[key]` | GET | `reports:read` | Runs analytical report and returns CSV, Excel, or PDF format. |
| `/api/cron` | GET | Bearer Secret | Automated background maintenance cron job runner. |

---

## 4. Server Action API Namespaces (`apps/admin/app/actions`)

Server actions validate inputs against generated Zod schemas (`action-schemas.json`) and check `requirePermission(resource, action)`.

| Namespace File | Key Action Functions | Permission Required |
|---|---|---|
| `crm.ts` | `createCRMDealAction`, `updateDealStageAction`, `createContactAction` | `deals:write`, `contacts:write` |
| `finance.ts` | `createInvoiceAction`, `createPaymentAction`, `createExpenseAction` | `invoices:write`, `payments:write` |
| `payroll.ts` | `generatePayrollRunAction`, `approvePayrollRunAction`, `markPayrollRunPaidAction` | `payroll:create`, `payroll:edit` |
| `approvals.ts` | `decideApprovalAction`, `updateApprovalPolicyAction` | Signed-In / `settings:write` |
| `inventory.ts` | `changeStockAction`, `transferStockAction`, `approveStockCountAction` | `inventory:edit`, `inventory:approve` |
| `delivery.ts` | `assignShipmentAction`, `createRouteSheetAction`, `settleCashAction` | `deliveries:assign`, `deliveries:edit` |
| `users.ts` | `createUserAction`, `updateUserRoleAction`, `suspendUserAction` | `users:write` |

---

## 5. Contract Code Generation

To regenerate API contracts and server action schemas:

```bash
# Regenerate TypeScript API contracts from combined OpenAPI YAML
npm run gen:contracts

# Regenerate server action input validation schemas
node scripts/generate-action-schemas.cjs
```
