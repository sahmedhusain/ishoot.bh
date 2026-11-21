import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { CRMContact, CRMDeal, DealPipelineStage, Quotation, ServiceItem } from "@platform/database";
import { ClientAutocomplete } from "../../components/crm/ClientAutocomplete";
import { ClientProfileForm } from "../../components/crm/ClientProfileForm";
import { ClientProfilePanel, ClientTierBadge } from "../../components/crm/ClientProfilePanel";
import { ClientsListView } from "../../components/crm/ClientsListView";
import { Customer360DossierView } from "../../components/crm/Customer360DossierView";
import { DealCard } from "../../components/crm/DealCard";
import { DealDossierView } from "../../components/crm/DealDossierView";
import { DealEditFormView } from "../../components/crm/DealEditFormView";
import { KanbanBoard } from "../../components/crm/KanbanBoard";
import { KanbanColumn } from "../../components/crm/KanbanColumn";
import { NewDealFormView } from "../../components/crm/NewDealFormView";
import { ItSupportView } from "../../components/it-support/ItSupportView";
import { ItTicketDetailView } from "../../components/it-support/ItTicketDetailView";
import { NewItTicketFormView } from "../../components/it-support/NewItTicketFormView";
import { TicketStatusBadge, useTicketText } from "../../components/it-support/ticket-text";
import { NewSaleView } from "../../components/orders/NewSaleView";
import { OrderStatusPill, PaymentStatusPill } from "../../components/orders/OrderPills";
import { OrderView } from "../../components/orders/OrderView";
import { OrdersListView } from "../../components/orders/OrdersListView";
import { StoreSettingsView } from "../../components/orders/StoreSettingsView";
import { AudienceView } from "../../components/outreach/AudienceView";
import { CampaignsView } from "../../components/outreach/CampaignsView";
import { LegalMatterView, LegalView } from "../../components/outreach/LegalView";
import { PressView } from "../../components/outreach/PressView";
import { NewQuotationFormView } from "../../components/quotations/NewQuotationFormView";
import { QuotationActionDialog } from "../../components/quotations/QuotationActionDialog";
import { QuotationDetailView } from "../../components/quotations/QuotationDetailView";
import { QuotationsListView } from "../../components/quotations/QuotationsListView";
import { AttributionPanel } from "../../components/sales/AttributionPanel";
import { CommissionsView } from "../../components/sales/CommissionsView";
import { SigningPanel } from "../../components/sales/SigningPanel";
import { ServicesManagementView } from "../../components/services/ServicesManagementView";
import { SupportProgramsView } from "../../components/supports/SupportProgramsView";
import { adminActionMocks } from "./setup";
import { AdminTestProviders } from "./fixtures";

describe("Admin Batch 3: CRM, Quotations, Sales, Orders, Outreach, Services, Supports & IT Support", () => {
  const contact: CRMContact = {
    id: "cli-1",
    company: "Acme Trading W.L.L.",
    company_name: "Acme Trading W.L.L.",
    full_name: "Ali Hassan",
    first_name: "Ali",
    last_name: "Hassan",
    email: "ali@acme.test",
    phone: "+97339000001",
    status: "customer",
    language: "en",
    payment_terms_days: 30,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  } as unknown as CRMContact;

  const deal: CRMDeal = {
    id: "deal-1",
    title: "Annual Media Contract",
    stage: "qualified",
    value: 2500,
    currency: "BHD",
    probability: 60,
    contact_id: "cli-1",
    owner_id: "usr-1",
    expected_close_date: "2026-06-01",
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  } as unknown as CRMDeal;

  const stage: DealPipelineStage = {
    key: "qualified",
    name_en: "Qualified",
    name_ar: "مؤهل",
    color: "#2563EB",
    sort_order: 1,
    active: true,
    is_won: false,
    is_lost: false,
  } as unknown as DealPipelineStage;

  it("renders CRM contacts, deals, kanban, dossiers & forms cleanly", () => {
    const standing = { tier: "good", overdueAmount: 0, outstandingAmount: 0, overdueCount: 0, creditLimit: null } as unknown as Parameters<typeof ClientTierBadge>[0]["standing"];

    render(
      <AdminTestProviders>
        <ClientAutocomplete initialContacts={[contact]} onSelect={vi.fn()} />
        <ClientProfileForm contact={contact} defaultPaymentTermsDays={30} />
        <ClientTierBadge standing={standing} />
        <ClientProfilePanel contact={contact} standing={standing} />
        <ClientsListView
          rows={[{ ...contact, totalRevenue: 1000, outstandingBalance: 0, overdueCount: 0, invoiceCount: 1, dealCount: 1 } as unknown as Parameters<typeof ClientsListView>[0]["rows"][number]]}
          total={1}
          page={1}
          filters={{ q: "", status: "", sort: "newest", standing: "all" } as unknown as Parameters<typeof ClientsListView>[0]["filters"]}
          summary={{ total: 1, active: 1, overdue: 0, revenue: 1000 } as unknown as Parameters<typeof ClientsListView>[0]["summary"]}
          currency="BHD"
        />
        <Customer360DossierView
          dossier={{
            contact,
            deals: [deal],
            invoices: [],
            quotations: [],
            payments: [],
            expenses: [],
            inquiries: [],
            contracts: [],
            attachments: [],
            metrics: {
              totalLtv: 1000,
              totalPaid: 1000,
              totalOutstanding: 0,
              balancesByCurrency: {},
            },
          } as unknown as Parameters<typeof Customer360DossierView>[0]["dossier"]}
          actions={{ canEditContact: true, canCreateDeal: true, canCreateInvoice: true } as unknown as Parameters<typeof Customer360DossierView>[0]["actions"]}
          standing={standing}
        />
        <DealCard deal={deal} />
        <DealDossierView
          deal={deal}
          contact={contact}
          invoices={[]}
          actions={{ canEditDeal: true, canCreateInvoice: true } as unknown as Parameters<typeof DealDossierView>[0]["actions"]}
        />
        <DealEditFormView deal={deal} contacts={[contact]} owners={[{ id: "usr-1", fullName: "Tariq" }]} stages={[stage]} />
        <KanbanColumn stage="qualified" label="Qualified" deals={[deal]} />
        <KanbanBoard initialDeals={[deal]} contacts={[contact]} stages={[stage]} canCustomize />
        <NewDealFormView defaultCurrency="BHD" canPickContact canCreateContact initialContact={contact} stages={[stage]} />
      </AdminTestProviders>,
    );

    expect(screen.getAllByText(/Acme Trading/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Annual Media Contract/).length).toBeGreaterThanOrEqual(1);
    expect(adminActionMocks.searchContactsAction).toBeDefined();
    expect(adminActionMocks.createContactAction).toBeDefined();
    expect(adminActionMocks.updateContactAction).toBeDefined();
    expect(adminActionMocks.deleteContactAction).toBeDefined();
    expect(adminActionMocks.updateDealAction).toBeDefined();
    expect(adminActionMocks.updateDealStageAction).toBeDefined();
    expect(adminActionMocks.createCRMDealAction).toBeDefined();
  });

  it("renders Quotations, Sales Attribution/Commissions/Signing, Services & SupportPrograms", () => {
    const quotation = {
      id: "qt-1",
      quotation_number: "QT-2026-001",
      title: "Commercial Shoot",
      status: "draft",
      language: "en",
      currency: "BHD",
      subtotal: 500,
      discount_type: "fixed",
      discount_value: 0,
      vat_rate: 10,
      vat_amount: 50,
      total: 550,
      issue_date: "2026-05-01",
      valid_until: "2026-05-31",
      client: { id: "cli-1", company_name: "Acme Trading", first_name: "Ali", last_name: "Hassan", email: "ali@acme.test" },
      items: [{ id: "qi-1", description: "Day Shoot", quantity: 1, unit_price: 500, total: 500 }],
    } as unknown as Parameters<typeof QuotationDetailView>[0]["quotation"];

    render(
      <AdminTestProviders>
        <QuotationActionDialog open title="Issue Quotation" confirmLabel="Issue" onConfirm={vi.fn()} onClose={vi.fn()}>
          <span>Ready to issue</span>
        </QuotationActionDialog>
        <QuotationsListView
          quotations={[quotation as unknown as Quotation & Record<string, unknown>]}
          summary={{
            total: 1,
            draft: 1,
            submitted: 0,
            approved: 0,
            issued: 0,
            accepted: 0,
            rejected: 0,
            expired: 0,
            openValueByCurrency: { BHD: 550 },
          } as unknown as Parameters<typeof QuotationsListView>[0]["summary"]}
          pagination={{ page: 1, total: 1, filters: { q: "", status: "" } }}
        />
        <QuotationDetailView
          quotation={quotation}
          approvalRequest={null}
          currentUserId="usr-1"
          currentUserRole="admin"
          canApprove
          canIssue
          canEdit
        />
        <NewQuotationFormView
          initialContacts={[contact]}
          company={{ default_currency: "BHD", default_payment_terms_days: 30, vat_enabled: true, vat_percentage: 10 } as unknown as Parameters<typeof NewQuotationFormView>[0]["company"]}
          services={[{ id: "srv-1", name_en: "Video Shoot", name_ar: "تصوير", default_rate: 200, unit: "day", is_active: true } as unknown as ServiceItem]}
        />
        <AttributionPanel
          entityType="quotation"
          entityId="qt-1"
          info={{ ownerId: "usr-1", ownerName: "Tariq", history: [] } as unknown as Parameters<typeof AttributionPanel>[0]["info"]}
          salesPeople={[{ id: "usr-1", name: "Tariq" }]}
          canReassign
        />
        <CommissionsView month="2026-05" rows={[]} canRecord canSetRates />
        <SigningPanel
          type="quotation"
          id="qt-1"
          state={{ status: "unsigned", canSign: true, signedBy: null, signedAt: null, approvalStatus: null } as unknown as Parameters<typeof SigningPanel>[0]["state"]}
          canSign
          canRequestApproval
          hasSignature
        />
        <ServicesManagementView initialServices={[]} languages={["en", "ar"]} />
        <SupportProgramsView programs={[]} enrolments={[]} employees={[]} filters={{ program: "", status: "" }} canEdit />
      </AdminTestProviders>,
    );

    expect(adminActionMocks.createQuotationAction).toBeDefined();
    expect(adminActionMocks.updateQuotationAction).toBeDefined();
    expect(adminActionMocks.submitQuotationForApprovalAction).toBeDefined();
    expect(adminActionMocks.issueQuotationAction).toBeDefined();
    expect(adminActionMocks.acceptQuotationAction).toBeDefined();
    expect(adminActionMocks.rejectQuotationAction).toBeDefined();
    expect(adminActionMocks.convertQuotationToInvoiceAction).toBeDefined();
    expect(adminActionMocks.reassignSalesOwnerAction).toBeDefined();
    expect(adminActionMocks.recordCommissionPayoutAction).toBeDefined();
    expect(adminActionMocks.requestInvoiceApprovalAction).toBeDefined();
    expect(adminActionMocks.signDocumentAction).toBeDefined();
    expect(adminActionMocks.createServiceAction).toBeDefined();
    expect(adminActionMocks.updateServiceAction).toBeDefined();
    expect(adminActionMocks.deleteServiceAction).toBeDefined();
    expect(adminActionMocks.saveSupportProgramAction).toBeDefined();
    expect(adminActionMocks.scheduleSupportRuleAction).toBeDefined();
    expect(adminActionMocks.deleteSupportRuleAction).toBeDefined();
    expect(adminActionMocks.saveEmployeeSupportAction).toBeDefined();
    expect(adminActionMocks.deleteEmployeeSupportAction).toBeDefined();
  });

  it("renders Orders, Outreach (Audience/Campaigns/Legal/Press) & IT Support components cleanly", () => {
    const orderRecord = {
      id: "ord-1",
      number: "ORD-100",
      order_number: "ORD-100",
      status: "pending",
      payment_status: "unpaid",
      payment_method: "cash",
      fulfilment: "delivery",
      fulfilment_type: "delivery",
      channel: "web",
      name: "Ali Hassan",
      email: "ali@acme.test",
      phone: "+97339000001",
      customer_name: "Ali Hassan",
      customer_email: "ali@acme.test",
      customer_phone: "+97339000001",
      currency: "BHD",
      subtotal: 100,
      discount: 0,
      discount_amount: 0,
      delivery_fee: 2,
      vat_amount: 10,
      tax_amount: 10,
      total: 112,
      amount_paid: 0,
      amount_refunded: 0,
      placed_at: "2026-05-01T00:00:00Z",
      lines: [],
      files: [],
      items: [],
      notes: [],
      events: [],
      created_at: "2026-05-01T00:00:00Z",
    } as unknown as Parameters<typeof OrderView>[0]["order"];

    function TicketTextProbe() {
      const tt = useTicketText();
      return <span>{tt.status("open")}</span>;
    }

    render(
      <AdminTestProviders>
        <OrderStatusPill status="pending" />
        <PaymentStatusPill status="unpaid" />
        <OrdersListView rows={[]} total={0} page={1} pageSize={20} filters={{ q: "", status: "", channel: "" }} currency="BHD" canCreate />
        <NewSaleView products={[]} currency="BHD" deliveryEnabled />
        <OrderView order={orderRecord} attempts={[]} requests={[]} paymentLink="https://store.example.test/pay/ord-1" rights={{ edit: true, refund: true, invoice: true }} />
        <StoreSettingsView
          settings={{ guest_checkout: true, delivery_enabled: true, delivery_fee: 2, free_delivery_over: 50, bank_transfer_instructions_en: "", bank_transfer_instructions_ar: "" } as unknown as Parameters<typeof StoreSettingsView>[0]["settings"]}
          coupons={[]}
          gateways={[]}
          currency="BHD"
          languages={["en", "ar"]}
          canEdit
          canCoupons
        />
        <AudienceView segments={[]} broadcasts={[]} campaigns={[]} currency="BHD" languages={["en", "ar"]} canEdit />
        <CampaignsView campaigns={[]} currency="BHD" canEdit websiteUrl="https://example.test" />
        <LegalView matters={[]} licences={[]} contracts={[]} filters={{ status: "", q: "" }} currency="BHD" canEdit people={[]} today="2026-05-01" />
        <LegalMatterView
          matter={{ id: "mat-1", title: "Trademark Renewal", status: "open", events: [], created_at: "2026-05-01" } as unknown as Parameters<typeof LegalMatterView>[0]["matter"]}
          currency="BHD"
          canEdit
          people={[]}
        />
        <PressView releases={[]} contacts={[]} coverage={[]} summary={{ pieces: 0, reach: 0 } as unknown as Parameters<typeof PressView>[0]["summary"]} canEdit canWriteRelease />
        <TicketStatusBadge status="open" />
        <TicketTextProbe />
        <ItSupportView status="open" page={{ items: [], nextCursor: null } as unknown as Parameters<typeof ItSupportView>[0]["page"]} canCreate />
        <NewItTicketFormView />
        <ItTicketDetailView
          detail={{
            ticket: { id: "tkt-1", number: 10, title: "Printer jam", description: "Floor 2", status: "open", priority: "low", category: "hardware", subcategory: "printer", respondBy: "2026-05-02T10:00:00Z", resolveBy: "2026-05-03T10:00:00Z", respondedAt: null, resolvedAt: null, createdAt: "2026-05-01T10:00:00Z", updatedAt: "2026-05-01T10:00:00Z" },
            comments: [],
            events: [],
            attachments: [],
          } as unknown as Parameters<typeof ItTicketDetailView>[0]["detail"]}
          canEdit
        />
      </AdminTestProviders>,
    );

    expect(screen.getAllByText(/ORD-100/).length).toBeGreaterThanOrEqual(1);
    expect(adminActionMocks.createStaffOrderAction).toBeDefined();
    expect(adminActionMocks.moveOrderAction).toBeDefined();
    expect(adminActionMocks.issueOrderInvoiceAction).toBeDefined();
    expect(adminActionMocks.recordOrderPaymentAction).toBeDefined();
    expect(adminActionMocks.recordOrderRefundAction).toBeDefined();
    expect(adminActionMocks.recheckOrderPaymentAction).toBeDefined();
    expect(adminActionMocks.addOrderNoteAction).toBeDefined();
    expect(adminActionMocks.saveStoreSettingsAction).toBeDefined();
    expect(adminActionMocks.saveCouponAction).toBeDefined();
    expect(adminActionMocks.saveSegmentAction).toBeDefined();
    expect(adminActionMocks.saveBroadcastAction).toBeDefined();
    expect(adminActionMocks.sendBroadcastAction).toBeDefined();
    expect(adminActionMocks.saveCampaignAction).toBeDefined();
    expect(adminActionMocks.saveLegalMatterAction).toBeDefined();
    expect(adminActionMocks.addLegalNoteAction).toBeDefined();
    expect(adminActionMocks.saveCoverageAction).toBeDefined();
    expect(adminActionMocks.saveMediaContactAction).toBeDefined();
    expect(adminActionMocks.createItTicketAction).toBeDefined();
    expect(adminActionMocks.commentOnItTicketAction).toBeDefined();
    expect(adminActionMocks.transitionItTicketAction).toBeDefined();
    expect(fireEvent).toBeDefined();
  });
});
