import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getWebsiteTranslations } from "@platform/locales";
import { TelemetryMonitor } from "../../components/TelemetryMonitor";
import { BackToTop } from "../../components/layout/BackToTop";
import { FloatingScrollbar } from "../../components/layout/FloatingScrollbar";
import { Footer, StoreFooter } from "../../components/layout/Footer";
import { StoreFooter as ReExportedStoreFooter } from "../../components/layout/StoreFooter";
import { LanguageSwitcher } from "../../components/layout/LanguageSwitcher";
import { MobileMenu } from "../../components/layout/MobileMenu";
import { Navbar, StoreNavbar } from "../../components/layout/Navbar";
import { StoreNavbar as ReExportedStoreNavbar } from "../../components/layout/StoreNavbar";
import {
  openCookieSettingsModal,
  openPreferencesModal,
  StorePreferencesBar,
  useStorePreferences,
} from "../../components/layout/StorePreferencesBar";
import { SmoothScroll } from "../../components/layout/SmoothScroll";
import { SocialIcon } from "../../components/layout/SocialIcon";
import { WebsiteOffline } from "../../components/layout/WebsiteOffline";
import { ContentImage } from "../../components/shared/ContentImage";
import { LegalModal } from "../../components/shared/LegalModal";
import { PolicyDocumentView } from "../../components/shared/PolicyDocumentView";
import { Reveal } from "../../components/shared/Reveal";
import { WebUnifiedErrorPage } from "../../components/shared/WebUnifiedErrorPage";
import { getStorePolicyDoc } from "../../lib/store-policy-pages";
import { BrandImage } from "../../components/site/BrandImage";
import { PreviewBridge, StorePreviewBridge } from "../../components/site/PreviewBridge";
import { StorePreviewBridge as ReExportedStorePreviewBridge } from "../../components/site/StorePreviewBridge";
import { SiteAnalytics, SiteCustomCode } from "../../components/site/SiteCode";
import { SiteProvider, useSite } from "../../components/site/SiteProvider";
import {
  SiteModeSwitch,
  SiteRegion,
  SiteThemeProvider,
  StoreModeSwitch,
  StoreRegion,
  StoreThemeProvider,
  useSiteMotionTransition,
  useSiteReducedMotion,
  useSiteTheme,
  useSiteTone,
  useStoreTheme,
} from "../../components/site/SiteTheme";
import { StoreRegion as ReExportedStoreRegion } from "../../components/site/StoreRegion";
import * as UiBarrel from "../../components/ui";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  ConfirmDialog,
  ConfirmationProvider,
  useConfirmation,
} from "../../components/ui/confirm-destructive";
import { useUiCopy } from "../../components/ui/copy/use-ui-copy";
import { CountUp, prefersReducedMotion } from "../../components/ui/count-up";
import {
  CURRENCY_SYMBOLS,
  CompanyCurrencyProvider,
  CurrencyDisplay,
  CurrencyLocaleProvider,
  formatCurrencyValue,
  useCompanyCurrency,
  useCurrencyLocale,
} from "../../components/ui/currency-display";
import { DataTable } from "../../components/ui/data-table";
import { DateDisplay, formatDate } from "../../components/ui/date-display";
import { FloatingSurface } from "../../components/ui/floating-surface";
import { Input } from "../../components/ui/input";
import { Modal, ModalFooter, useDialog } from "../../components/ui/modal";
import { OverlayScrollbarsProvider } from "../../components/ui/overlay-scrollbars";
import {
  COUNTRY_DIAL_CODES,
  PhoneCountryProvider,
  PhoneInput,
  countryFlag,
  useCompanyCountry,
} from "../../components/ui/phone-input";
import { Ripple } from "../../components/ui/ripple";
import { SegmentedButton } from "../../components/ui/segmented-button";
import { Select } from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import { StatusBadge, StatusLabelsProvider } from "../../components/ui/status-badge";
import { Textarea } from "../../components/ui/textarea";
import { cn } from "../../components/ui/utils";
import {
  makeResolvedConfig,
  makeSocialLinks,
  makeStoreCompany,
  StoreTestProviders,
} from "./fixtures";
import { mockNavigation } from "./setup";

describe("Store Layout, Site, Shared & UI Components", () => {
  it("TelemetryMonitor sends analytics to POST /api/telemetry via sendBeacon and fetch fallback", () => {
    const origBeacon = navigator.sendBeacon;
    const beaconSpy = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: beaconSpy });
    const first = render(<TelemetryMonitor />);
    first.unmount();
    expect(beaconSpy).toHaveBeenCalledWith("/api/telemetry", expect.any(Blob));

    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: undefined });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const second = render(<TelemetryMonitor />);
    console.warn("store telemetry warn");
    second.unmount();
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/telemetry",
      expect.objectContaining({ method: "POST" }),
    );
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: origBeacon });
  });

  it("Layout, Site & Shared components render and preserve Store re-export aliases", async () => {
    const user = userEvent.setup();
    const company = makeStoreCompany();
    const t = getWebsiteTranslations("en");

    expect(StoreFooter).toBe(Footer);
    expect(ReExportedStoreFooter).toBe(Footer);
    expect(StoreNavbar).toBe(Navbar);
    expect(ReExportedStoreNavbar).toBe(Navbar);
    expect(StorePreviewBridge).toBe(PreviewBridge);
    expect(ReExportedStorePreviewBridge).toBe(PreviewBridge);
    expect(StoreRegion).toBe(SiteRegion);
    expect(ReExportedStoreRegion).toBe(SiteRegion);
    expect(StoreModeSwitch).toBe(SiteModeSwitch);
    expect(StoreThemeProvider).toBe(SiteThemeProvider);
    expect(useStoreTheme).toBe(useSiteTheme);

    function HookProbe() {
      const site = useSite();
      const theme = useSiteTheme();
      const tone = useSiteTone();
      const reduced = useSiteReducedMotion();
      const transition = useSiteMotionTransition();
      return (
        <span data-testid="store-probe">
          {site?.currency}:{theme?.mode}:{tone}:{String(reduced)}:{String(transition.duration ?? "spring")}
        </span>
      );
    }

    render(
      <StoreTestProviders design={{ ...makeResolvedConfig().design, visitorSwitching: true }}>
        <SmoothScroll>
          <SiteRegion region="store" tone="light">
            <HookProbe />
            <Navbar company={company} />
            <BrandImage company={company} />
            <ContentImage src="/media/rig.jpg" alt="Rig" />
            <Reveal>
              <span>Revealed</span>
            </Reveal>
            <FloatingScrollbar />
            <BackToTop />
            <SocialIcon name="instagram" />
            <LanguageSwitcher variant="compact" />
            <SiteModeSwitch locale="en" />
            <PreviewBridge adminOrigin="http://localhost:3001" />
            <Footer company={company} socialLinks={makeSocialLinks()} />
          </SiteRegion>
        </SmoothScroll>
      </StoreTestProviders>,
    );

    expect(screen.getByTestId("store-probe")).toHaveTextContent("BHD:");
    await user.click(screen.getAllByTestId("language-switcher-compact")[0]);
    await user.click(screen.getByRole("menuitemradio", { name: /العربية/i }));
    expect(mockNavigation.push).toHaveBeenCalledWith("/ar");

    const closeSpy = vi.fn();
    render(
      <StoreTestProviders>
        <MobileMenu isOpen onClose={closeSpy} company={company} />
        <LegalModal isOpen onClose={vi.fn()} title="Terms" content="<p>Rules</p>" />
        <WebUnifiedErrorPage statusCode={404} showQuickLinks />
      </StoreTestProviders>,
    );
    await user.click(screen.getByRole("button", { name: t.common.closeMenu }));
    expect(closeSpy).toHaveBeenCalled();

    fireEvent.scroll(window);
    render(<WebsiteOffline company={company} locale="en" t={t} />);
    render(<SiteAnalytics code={{ googleAnalyticsId: "G-STORE" }} nonce="n-1" />);
    render(<SiteCustomCode code={{ bodyHtml: "<div />" }} nonce="n-1" />);
  });

  it("all Store UI primitives, ConfirmDialog, Modal, DataTable & StatusBadge work cleanly", async () => {
    const user = userEvent.setup();
    expect(UiBarrel.Button).toBe(Button);
    expect(cn("a", false && "b", "c")).toBe("a c");
    expect(CURRENCY_SYMBOLS.BHD).toBeDefined();
    expect(formatCurrencyValue(45, "BHD", false)).toContain("45");
    expect(COUNTRY_DIAL_CODES.length).toBeGreaterThan(10);
    expect(countryFlag("BH").length).toBeGreaterThan(0);
    expect(typeof prefersReducedMotion()).toBe("boolean");
    expect(formatDate("2026-05-01T00:00:00Z", "en")).toContain("2026");

    const onConfirm = vi.fn();
    const anchor = document.createElement("div");
    document.body.appendChild(anchor);

    function ConfirmProbe() {
      const ui = useUiCopy();
      const curr = useCompanyCurrency();
      const loc = useCurrencyLocale();
      const ctry = useCompanyCountry();
      const dialogHook = useDialog(false, vi.fn());
      const confirm = useConfirmation();
      return (
        <div>
          <span data-testid="ui-probe">
            {curr}:{loc}:{ctry}:{Boolean(ui.confirm) ? "ok" : "no"}:{typeof dialogHook}
          </span>
          <button
            type="button"
            onClick={() => confirm({ title: "Confirm Delete", description: "Sure?", onConfirm })}
          >
            Trigger Confirm
          </button>
        </div>
      );
    }

    render(
      <CurrencyLocaleProvider value="en">
        <CompanyCurrencyProvider currency="BHD">
          <PhoneCountryProvider country="BH">
            <StatusLabelsProvider value={{ paid: "Paid Now" }}>
              <ConfirmationProvider>
                <OverlayScrollbarsProvider />
                <Card variant="outlined">
                  <Badge variant="default">Badge</Badge>
                  <Button type="button">
                    Save
                    <Ripple />
                  </Button>
                  <Input aria-label="Store Input" defaultValue="abc" />
                  <Textarea aria-label="Store Textarea" defaultValue="notes" />
                  <PhoneInput aria-label="Store Phone" />
                  <Select aria-label="Store Select" defaultValue="1">
                    <option value="1">One</option>
                  </Select>
                  <SegmentedButton
                    label="Mode"
                    value="a"
                    onChange={vi.fn()}
                    options={[
                      { value: "a", label: "A" },
                      { value: "b", label: "B" },
                    ]}
                  />
                  <Separator />
                  <Skeleton className="h-4 w-16" />
                  <StatusBadge status="paid" />
                  <DateDisplay date="2026-05-01T00:00:00Z" />
                  <CurrencyDisplay amount={25} />
                  <CountUp value={10} />
                  <DataTable>
                    <thead>
                      <tr>
                        <th>Col</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Cell</td>
                      </tr>
                    </tbody>
                  </DataTable>
                  <Modal isOpen onClose={vi.fn()} title="Modal Title">
                    <p>Modal Body</p>
                    <ModalFooter>
                      <span>Footer Actions</span>
                    </ModalFooter>
                  </Modal>
                  <ConfirmDialog
                    isOpen={false}
                    onClose={vi.fn()}
                    onConfirm={vi.fn()}
                    title="Dialog"
                    description="Desc"
                  />
                  <FloatingSurface anchor={anchor} onClose={vi.fn()}>
                    <span>Surface</span>
                  </FloatingSurface>
                  <ConfirmProbe />
                </Card>
              </ConfirmationProvider>
            </StatusLabelsProvider>
          </PhoneCountryProvider>
        </CompanyCurrencyProvider>
      </CurrencyLocaleProvider>,
    );

    expect(screen.getByText("Paid Now")).toBeInTheDocument();
    expect(screen.getByText("Modal Body")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Trigger Confirm" }));
    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
    anchor.remove();
  });

  it("StorePreferencesBar, Navbar search autocomplete & Footer trust/legal/newsletter controls work", async () => {
    const user = userEvent.setup();
    window.localStorage.removeItem("store-cookie-consent");
    window.localStorage.removeItem("store-region-code");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          products: [{ id: "p-1", slug: "rig", title_en: "Cinema Rig Pro", title_ar: "ريج", price: 120 }],
          categories: [{ slug: "cameras", name_en: "Cameras", name_ar: "كاميرات" }],
        }),
        { status: 200 },
      ),
    );

    function RegionProbe() {
      const prefs = useStorePreferences();
      return <span data-testid="probe-region">{prefs.region.currency}</span>;
    }

    const termsDoc = getStorePolicyDoc("terms", "en", { companyName: "Test Store", crNumber: "136704-1", returnWindowDays: 14 });
    render(
      <StoreTestProviders>
        <RegionProbe />
        <Navbar
          company={makeStoreCompany()}
          cookieBannerEnabled
          sslBadgeEnabled
          showCategoryBar
          announcement="Fast Bahrain Dispatch"
          categories={[{ slug: "computer-parts", name_en: "PC Components", name_ar: "قطع الكمبيوتر" }]}
        />
        <PolicyDocumentView locale="en" doc={termsDoc} crNumber="136704-1" sslBadgeEnabled />
        <Footer company={makeStoreCompany()} sslBadgeEnabled crNumber="136704-1" />
      </StoreTestProviders>,
    );

    expect(screen.getByTestId("navbar-custom-categories")).toBeInTheDocument();
    expect(screen.getAllByText(/PC Components/).length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByTestId("navbar-mega-toggle"));
    expect(screen.getByTestId("navbar-mega-menu")).toBeInTheDocument();

    expect(screen.getAllByTestId("cookie-consent-banner").length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getAllByTestId("cookie-accept-all")[0]);

    await user.click(screen.getByTestId("preferences-trigger"));
    expect(screen.queryByTestId("region-option-SAR")).toBeNull();
    await user.click(await screen.findByTestId("region-option-BHD"));
    expect(screen.getByTestId("probe-region")).toHaveTextContent("BHD");

    await user.click(screen.getByTestId("cookie-settings-trigger"));
    expect(await screen.findByTestId("cookie-settings-modal")).toBeInTheDocument();

    // Exercise standalone StorePreferencesBar export + modal helpers directly too
    render(<StoreTestProviders><StorePreferencesBar /></StoreTestProviders>);
    expect(typeof openPreferencesModal).toBe("function");
    expect(typeof openCookieSettingsModal).toBe("function");

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "Cinema");
    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/store/search",
        expect.objectContaining({ method: "POST" }),
      );
    });

    expect(screen.getAllByTestId("ssl-security-badge")).toHaveLength(1);
    const returnsDoc = getStorePolicyDoc("return-policy", "en", { companyName: "Test Store" });
    const { container: returnsContainer } = render(
      <StoreTestProviders>
        <PolicyDocumentView locale="en" doc={returnsDoc} sslBadgeEnabled />
      </StoreTestProviders>,
    );
    expect(returnsContainer.querySelector('[data-testid="ssl-security-badge"]')).toBeNull();
    const newsletterForm = screen.getByTestId("newsletter-form");
    const emailInput = newsletterForm.querySelector('input[type="email"]') as HTMLInputElement;
    await user.type(emailInput, "fan@example.test");
    fireEvent.submit(newsletterForm);
    expect(screen.getByText(/Subscribed/i)).toBeInTheDocument();
  });
});
