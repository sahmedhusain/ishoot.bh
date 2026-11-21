import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  EmployeeExtendedProfileFields,
  emptyExtendedProfile,
} from "../../components/hr/EmployeeExtendedProfileFields";
import { EmployeeExtendedProfileCard } from "../../components/hr/EmployeeExtendedProfileCard";
import { NewEmployeeFormView } from "../../components/hr/NewEmployeeFormView";
import { AccountSettingsDialog } from "../../components/shared/AccountSettingsDialog";
import { UsersManagementView } from "../../components/users/UsersManagementView";
import { adminActionMocks } from "./setup";
import { AdminTestProviders } from "./fixtures";
import * as React from "react";

function ControlledExtendedFields() {
  const [val, setVal] = React.useState(() => emptyExtendedProfile());
  return (
    <AdminTestProviders>
      <EmployeeExtendedProfileFields value={val} onChange={setVal} />
      <pre data-testid="profile-json">{JSON.stringify(val)}</pre>
    </AdminTestProviders>
  );
}

describe("HR Extended Profile, Onboarding User Modes & Non-HR User Flows", () => {
  it("EmployeeExtendedProfileFields adds unlimited contacts, work/personal emails with account sync, emergency contacts & health record", async () => {
    const user = userEvent.setup();
    render(<ControlledExtendedFields />);

    // Add 2 contacts & switch default to the second one
    await user.click(screen.getByRole("button", { name: /Add Contact/i }));
    await user.click(screen.getByRole("button", { name: /Add Contact/i }));
    const setDefaultBtns = screen.getAllByRole("button", { name: /Set Default/i });
    await user.click(setDefaultBtns[0]);

    // Add Work & Personal email
    await user.click(screen.getByRole("button", { name: /Add Work Email/i }));
    await user.click(screen.getByRole("button", { name: /Add Personal Email/i }));
    const emailInputs = screen.getAllByPlaceholderText(/company\.bh|personal@gmail\.com/i);
    await user.type(emailInputs[0], "nasser@zayedgroup.bh");
    await user.type(emailInputs[1], "nasser.home@gmail.com");

    // Add Emergency contact
    await user.click(screen.getByRole("button", { name: /Add Emergency Contact/i }));
    await user.type(screen.getByPlaceholderText(/Contact full name/i), "Fatima Al-Doseri");

    // Fill Health Insurance & Work Location
    await user.type(screen.getByPlaceholderText(/Solidarity/i), "Solidarity Bahrain");
    await user.type(screen.getByPlaceholderText(/Seef HQ/i), "Seef Tower HQ");

    const parsed = JSON.parse(screen.getByTestId("profile-json").textContent || "{}");
    expect(parsed.contacts).toHaveLength(2);
    expect(parsed.contacts[1].isPrimary).toBe(true);
    expect(parsed.emails).toHaveLength(2);
    expect(parsed.emails[0].type).toBe("work");
    expect(parsed.emails[0].syncToAccount).toBe(true);
    expect(parsed.emails[1].type).toBe("personal");
    expect(parsed.emergencyContacts[0].name).toBe("Fatima Al-Doseri");
    expect(parsed.healthRecord.insuranceProvider).toBe("Solidarity Bahrain");
    expect(parsed.workLocation).toBe("Seef Tower HQ");
  });

  it("EmployeeExtendedProfileCard toggles edit mode and saves via saveEmployeeExtendedProfileAction", async () => {
    const user = userEvent.setup();
    adminActionMocks.saveEmployeeExtendedProfileAction.mockResolvedValueOnce({
      success: true,
      profile: {
        ...emptyExtendedProfile({ email: "ali@zayedgroup.bh" }),
        workLocation: "Diplomatic Area",
      },
    });

    render(
      <AdminTestProviders>
        <EmployeeExtendedProfileCard
          employeeId="emp-101"
          initialProfile={emptyExtendedProfile({ email: "ali@zayedgroup.bh" })}
          canEdit
        />
      </AdminTestProviders>,
    );

    await user.click(screen.getByRole("button", { name: /Edit Extended Profile/i }));
    const locInput = screen.getByPlaceholderText(/Seef HQ/i);
    await user.type(locInput, "Diplomatic Area");
    await user.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(adminActionMocks.saveEmployeeExtendedProfileAction).toHaveBeenCalledWith(
        "emp-101",
        expect.objectContaining({ workLocation: "Diplomatic Area" }),
      );
    });
  });

  it("NewEmployeeFormView supports 3 account modes (none, existing, request_it with username + example user) and submits extendedProfile", async () => {
    const user = userEvent.setup();
    adminActionMocks.createEmployeeAction.mockResolvedValueOnce({
      success: true,
      employee: { id: "emp-new-1", employeeNumber: "EMP-1009" },
      itTicketId: "tkt-hr-1",
    });

    render(
      <AdminTestProviders>
        <NewEmployeeFormView
          departments={[{ id: "d-sales", nameEn: "Sales", nameAr: "المبيعات", code: "SLS", is_active: true } as any]}
          existingUsers={[
            { id: "ahmed-zayani", fullName: "Ahmed Al-Zayani", email: "ahmed@zayedgroup.bh", username: "ahmed.zayani", role: "sales", alreadyLinked: true },
            { id: "ext-khalil", fullName: "Khalil Al-Shaikh", email: "khalil@zayedgroup.bh", username: "khalil.alshaikh", role: "finance", alreadyLinked: false },
          ]}
          canSetPay
        />
      </AdminTestProviders>,
    );

    const reqInputs = document.querySelectorAll("form input[required]");
    fireEvent.change(reqInputs[0], { target: { value: "Hassan" } });
    fireEvent.change(reqInputs[1], { target: { value: "Al-Malki" } });
    fireEvent.change(reqInputs[2], { target: { value: "Account Executive" } });

    // Select Request New User from IT (3rd radio button)
    const radios = screen.getAllByRole("radio");
    await user.click(radios[radios.length - 1]);

    // Auto-suggest username -> hassan.almalki
    await user.click(screen.getByRole("button", { name: /Suggest/i }));

    // Select Sales example user
    const refSelect = screen.getByDisplayValue(/Not specified|IT/i);
    await user.selectOptions(refSelect, "ahmed-zayani");

    // Submit
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(adminActionMocks.createEmployeeAction).toHaveBeenCalledWith(
        expect.objectContaining({
          firstNameEn: "Hassan",
          lastNameEn: "Al-Malki",
          userAccountMode: "request_it",
          requestedUsername: "hassan.almalki",
          referenceUserId: "ahmed-zayani",
          referenceUserRole: "sales",
          extendedProfile: expect.any(Object),
        }),
      );
    });
  });

  it("AccountSettingsDialog shows 1-click Create Employee Profile CTA when unlinked and Open HR Profile link when linked", () => {
    const { rerender } = render(
      <AdminTestProviders>
        <AccountSettingsDialog
          value={{
            userId: "ext-auditor-khalil",
            fullName: "Khalil Al-Shaikh",
            role: "finance",
            managerId: null,
            status: "active",
            discountLimitPercent: null,
            commissionRatePercent: null,
            employeeId: null,
          }}
          fields={["role", "status"]}
          roles={[{ id: "finance", name: "Finance" }]}
          managers={[]}
          requiresApproval={false}
          canCreateEmployees
          onClose={vi.fn()}
        />
      </AdminTestProviders>,
    );

    const createLink = screen.getByRole("link", { name: /Create employee profile/i });
    expect(createLink.getAttribute("href")).toContain("/dashboard/hr/employees/new?userId=ext-auditor-khalil");

    rerender(
      <AdminTestProviders>
        <AccountSettingsDialog
          value={{
            userId: "ahmed-zayani",
            fullName: "Ahmed Al-Zayani",
            role: "sales",
            managerId: null,
            status: "active",
            discountLimitPercent: null,
            commissionRatePercent: null,
            employeeId: "emp-ahmed",
          }}
          fields={["role", "status"]}
          roles={[{ id: "sales", name: "Sales" }]}
          managers={[]}
          requiresApproval={false}
          canCreateEmployees
          onClose={vi.fn()}
        />
      </AdminTestProviders>,
    );

    const viewLink = screen.getByRole("link", { name: /View/i });
    expect(viewLink.getAttribute("href")).toContain("/dashboard/hr/employees/emp-ahmed");
  });

  it("UsersManagementView renders No Employee Record quick filter pill and filters unlinked users", async () => {
    const user = userEvent.setup();
    render(
      <AdminTestProviders>
        <UsersManagementView
          canWrite
          canDelete={false}
          canCreateEmployees
          employees={[]}
          initialUsers={[
            {
              id: "u-linked",
              full_name: "Layla Nasser",
              email: "layla@zayedgroup.bh",
              role: "finance_manager",
              is_active: true,
              employee_id: "emp-layla",
            } as any,
            {
              id: "ext-khalil",
              full_name: "Khalil Al-Shaikh",
              email: "khalil@zayedgroup.bh",
              role: "finance",
              is_active: true,
              employee_id: null,
            } as any,
          ]}
          total={2}
          page={1}
          pageSize={25}
          filters={{ q: "", role: "all", departmentId: "all", status: "all" }}
          people={[]}
          roles={[{ id: "finance", nameEn: "Finance", nameAr: "المالية" }]}
          resources={[]}
          rolePermissions={{}}
          departments={[]}
        />
      </AdminTestProviders>,
    );

    expect(screen.getByText("Layla Nasser")).toBeInTheDocument();
    expect(screen.getByText("Khalil Al-Shaikh")).toBeInTheDocument();

    const filterBtn = screen.getByRole("button", { name: /No employee record/i });
    await user.click(filterBtn);

    expect(screen.queryByText("Layla Nasser")).not.toBeInTheDocument();
    expect(screen.getByText("Khalil Al-Shaikh")).toBeInTheDocument();
  });
});
