import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getWebsiteTranslations } from "@platform/locales";
import { AccountDashboard, OrderHelp } from "../../components/account/AccountDashboard";
import { AccountSignIn } from "../../components/account/AccountSignIn";
import { OrderAttachments, PrintOrder } from "../../components/account/OrderAttachments";
import { WishlistButton } from "../../components/account/WishlistButton";
import {
  accountPost,
  card,
  field,
  label,
  primaryButton,
  secondaryButton,
  statusTone,
} from "../../components/account/ui";
import { makeAddresses, makeCustomerProfile, StoreTestProviders } from "./fixtures";
import { mockNavigation } from "./setup";

describe("Store Account, Auth, Wishlist & Orders Components", () => {
  it("accountPost and UI helpers POST to /api/account/${action} and throw on HTTP/domain errors", async () => {
    expect(statusTone("paid")).toContain("primary");
    expect(statusTone("cancelled")).toContain("error");
    expect(statusTone("pending")).toContain("secondary");
    expect(card.length).toBeGreaterThan(0);
    expect(field.length).toBeGreaterThan(0);
    expect(label.length).toBeGreaterThan(0);
    expect(primaryButton.length).toBeGreaterThan(0);
    expect(secondaryButton.length).toBeGreaterThan(0);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "invalid_credentials" }), { status: 401 }));

    const ok = await accountPost("ping", { ok: true });
    expect(ok).toEqual({ success: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/account/${"ping"}`,
      expect.objectContaining({ method: "POST" }),
    );

    await expect(accountPost("sign-in", { email: "bad" })).rejects.toThrow("invalid_credentials");
  });

  it("AccountSignIn switches tabs (password, code, signUp) and POSTs sign-in and sign-up", async () => {
    const user = userEvent.setup();
    const t = getWebsiteTranslations("en");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    const { container } = render(
      <StoreTestProviders>
        <AccountSignIn locale="en" providers={{ google: false, apple: false }} notice="" next="/en/account" />
      </StoreTestProviders>,
    );

    const emailInput = container.querySelector<HTMLInputElement>('input[type="email"]')!;
    const passInput = container.querySelector<HTMLInputElement>('input[type="password"]')!;
    await user.type(emailInput, "buyer@example.test");
    await user.type(passInput, "ValidPass123!");
    await user.click(container.querySelector('button[type="submit"]')!);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/account/sign-in",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockNavigation.push).toHaveBeenCalledWith("/en/account");
    });

    await user.click(screen.getByRole("tab", { name: t.account.tabs.signUp }));
    const signUpName = container.querySelector<HTMLInputElement>('input[name="name"]')!;
    const signUpEmail = container.querySelector<HTMLInputElement>('input[name="email"]')!;
    const signUpPass = container.querySelector<HTMLInputElement>('input[name="password"]')!;
    await user.type(signUpName, "Noora Zayed");
    await user.clear(signUpEmail);
    await user.type(signUpEmail, "noora@example.test");
    await user.clear(signUpPass);
    await user.type(signUpPass, "ValidPass123!");
    await user.click(container.querySelector('button[type="submit"]')!);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/account/sign-up",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("AccountDashboard, OrderHelp, WishlistButton, OrderAttachments & PrintOrder execute account actions", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ success: true, saved: true }), { status: 200 }));

    render(
      <StoreTestProviders>
        <AccountDashboard
          locale="en"
          customer={makeCustomerProfile()}
          addresses={makeAddresses()}
          wishlist={[
            {
              id: "prod-1",
              slug: "cinema-rig",
              title_en: "Cinema Rig Pro",
              title_ar: "منصة",
              thumbnail_url: "/media/rig.jpg",
              price: 120,
            },
          ]}
          orders={[
            {
              id: "ord-1",
              number: "ORD-2026-001",
              status: "paid",
              fulfilment: "delivery",
              total: 266,
              currency: "BHD",
              placed_at: "2026-05-01T10:00:00Z",
              lines: [{ description: "Cinema Rig Pro", quantity: 2 }],
            },
          ]}
        />
        <OrderHelp orderId="ord-1" locale="en" />
        <WishlistButton itemId="prod-2" initiallySaved={false} signedIn next="/en/products/cob-light-300" />
        <PrintOrder locale="en" />
      </StoreTestProviders>,
    );

    expect(screen.getAllByText(/Layla Khalifa/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("ORD-2026-001")).toBeInTheDocument();

    await user.click(screen.getByTestId("wishlist-toggle"));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/account/wishlist",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await user.click(screen.getByTestId("account-sign-out"));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/account/sign-out",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const attRender = render(
      <StoreTestProviders>
        <OrderAttachments
          orderId="ord-1"
          files={[{ id: "f-1", fileName: "receipt.pdf" }]}
          enabled
          locale="en"
        />
      </StoreTestProviders>,
    );

    expect(screen.getByText("receipt.pdf")).toBeInTheDocument();
    const attInput = attRender.container.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(attInput, new File(["%PDF-1.4"], "po.pdf", { type: "application/pdf" }));
    fireEvent.submit(attRender.container.querySelector("form")!);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/account/orders/ord-1/attachments",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
