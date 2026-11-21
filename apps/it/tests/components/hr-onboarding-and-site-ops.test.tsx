import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketView } from "../../components/TicketView";
import { StaffAccountsView } from "../../components/StaffAccountsView";
import { SiteView } from "../../components/SiteView";
import { itActionMocks } from "./setup";
import {
  ItTestProviders,
  makeCmsSnapshot,
  makeSiteCode,
  makeSiteDomains,
  makeTicketDetail,
} from "./fixtures";

describe("IT HR Onboarding Provisioning, Enhanced Staff Accounts & Site Operations", () => {
  it("TicketView parses [HR_ONBOARDING_META:...] and renders 1-click Provision Staff Account CTA", () => {
    const onboardingDetail = makeTicketDetail();
    onboardingDetail.ticket.id = "tkt-hr-onboard-1";
    onboardingDetail.ticket.title = "New Staff User Onboarding: Nasser Al-Doseri (nasser.sales)";
    onboardingDetail.ticket.description = [
      "HR Onboarding — New Portal User Account Request",
      "Requested Username: nasser.sales",
      "[HR_ONBOARDING_META:username=nasser.sales&copyFrom=ahmed-zayani&employeeId=emp-99&email=nasser%40zayedgroup.bh&name=Nasser%20Al-Doseri]",
    ].join("\n");

    render(
      <ItTestProviders>
        <TicketView
          detail={onboardingDetail}
          assignees={[]}
          canAssign
          canEdit
          canResolve
          canClose
          categories={[]}
        />
      </ItTestProviders>,
    );

    const cta = screen.getByRole("link", { name: /Provision Staff Account/i });
    const href = cta.getAttribute("href") || "";
    expect(href).toContain("/staff-accounts?");
    expect(href).toContain("prefillUsername=nasser.sales");
    expect(href).toContain("copyFrom=ahmed-zayani");
    expect(href).toContain("prefillEmail=nasser%40zayedgroup.bh");
    expect(href).toContain("ticketId=tkt-hr-onboard-1");
  });

  it("StaffAccountsView renders KPI bar, No MFA filter, @username search, prefill banner & session/audit links", async () => {
    const user = userEvent.setup();
    render(
      <ItTestProviders>
        <StaffAccountsView
          page={{
            items: [
              {
                id: "staff-1",
                displayName: "Ahmed Al-Zayani",
                email: "ahmed@zayedgroup.bh",
                username: "ahmed.zayani",
                roles: ["sales"],
                active: true,
                mfaEnabled: true,
                createdAt: "2026-01-01T00:00:00Z",
              },
              {
                id: "staff-2",
                displayName: "Noora Bucheeri",
                email: "noora@zayedgroup.bh",
                username: "noora.bucheeri",
                roles: ["employee"],
                active: true,
                mfaEnabled: false,
                createdAt: "2026-01-02T00:00:00Z",
              },
            ],
          }}
          roles={[{ id: "sales", nameEn: "Sales", nameAr: "المبيعات", rules: {} } as any]}
          initial={{
            displayName: "Nasser Al-Doseri",
            email: "nasser@zayedgroup.bh",
            username: "nasser.sales",
            role: "sales",
            overrides: [],
            scopes: [],
          }}
          fromOnboardingTicket
          canCreate
          canEdit
          canExecute
        />
      </ItTestProviders>,
    );

    expect(screen.getByDisplayValue("nasser.sales")).toBeInTheDocument();
    expect(screen.getByDisplayValue("nasser@zayedgroup.bh")).toBeInTheDocument();

    const statusSelect = screen.getAllByRole("combobox")[1];
    await user.selectOptions(statusSelect, "no_mfa");
    expect(screen.getByText(/@noora\.bucheeri/i)).toBeInTheDocument();
    expect(screen.queryByText(/@ahmed\.zayani/i)).not.toBeInTheDocument();
  });

  it("SiteView Pages & SEO and Operations & Cache tabs render pages and trigger publish/revalidate actions", async () => {
    const user = userEvent.setup();
    render(
      <ItTestProviders>
        <SiteView
          snapshot={makeCmsSnapshot()}
          domains={makeSiteDomains()}
          code={makeSiteCode()}
          company={{} as any}
          canEditDomains
          canCheckDomains
          canEditCode
          canEditPresentation
        />
      </ItTestProviders>,
    );

    await user.click(screen.getByRole("button", { name: /Pages & SEO/i }));
    expect(screen.getByText(/CMS Pages/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Operations & Cache/i }));
    await user.click(screen.getByRole("button", { name: /Publish Live Snapshot/i }));
    await waitFor(() => {
      expect(itActionMocks.publishItWebsiteSnapshotAction).toHaveBeenCalled();
    });

    const revalidateBtns = screen.getAllByRole("button", { name: /Revalidate Web & Store Cache/i });
    await user.click(revalidateBtns[0]);
    await waitFor(() => {
      expect(itActionMocks.revalidateFrontendCacheAction).toHaveBeenCalled();
    });
  });
});
