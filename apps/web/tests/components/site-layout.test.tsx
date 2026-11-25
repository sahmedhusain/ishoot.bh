import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getWebsiteTranslations } from "@platform/locales";
import { TelemetryMonitor } from "../../components/TelemetryMonitor";
import { BackToTop } from "../../components/layout/BackToTop";
import { FloatingScrollbar } from "../../components/layout/FloatingScrollbar";
import { CookieConsentBanner, OPEN_COOKIE_PREFERENCES_EVENT, openCookiePreferences } from "../../components/layout/CookieConsentBanner";
import { LegalPolicyView } from "../../components/legal/LegalPolicyView";
import { Footer } from "../../components/layout/Footer";
import { LanguageSwitcher } from "../../components/layout/LanguageSwitcher";
import { MobileMenu } from "../../components/layout/MobileMenu";
import { Navbar } from "../../components/layout/Navbar";
import { SmoothScroll } from "../../components/layout/SmoothScroll";
import { SocialIcon } from "../../components/layout/SocialIcon";
import { WebsiteOffline } from "../../components/layout/WebsiteOffline";
import { ContentImage } from "../../components/shared/ContentImage";
import { LegalModal } from "../../components/shared/LegalModal";
import { Reveal } from "../../components/shared/Reveal";
import { ScrollReveal } from "../../components/shared/ScrollReveal";
import { SectionBadge } from "../../components/shared/SectionBadge";
import { WebUnifiedErrorPage } from "../../components/shared/WebUnifiedErrorPage";
import { BrandImage } from "../../components/site/BrandImage";
import { PreviewBridge } from "../../components/site/PreviewBridge";
import { SiteAnalytics, SiteCustomCode } from "../../components/site/SiteCode";
import { SiteProvider, useSite } from "../../components/site/SiteProvider";
import {
  SiteModeSwitch,
  SiteRegion,
  SiteThemeProvider,
  useSiteMotionTransition,
  useSiteReducedMotion,
  useSiteTheme,
  useSiteTone,
} from "../../components/site/SiteTheme";
import { mockNavigation } from "./setup";
import { makeResolvedConfig, makeSocialLinks, makeWebCompany, WebTestProviders } from "./fixtures";

describe("Web Telemetry, Layout, Site & Shared Components", () => {
  it("TelemetryMonitor flushes route visits and console errors to POST /api/telemetry", () => {
    const origBeacon = navigator.sendBeacon;
    const beaconSpy = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: beaconSpy,
    });

    const { unmount } = render(<TelemetryMonitor />);
    expect(beaconSpy).not.toHaveBeenCalled();
    unmount();
    expect(beaconSpy).toHaveBeenCalledWith(
      "/api/telemetry",
      expect.any(Blob),
    );

    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const run2 = render(<TelemetryMonitor />);
    console.warn("unit-test telemetry warn");
    run2.unmount();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/telemetry",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: origBeacon,
    });
  });

  it("Navbar, MobileMenu, LanguageSwitcher, BackToTop, FloatingScrollbar, SmoothScroll, SocialIcon & WebsiteOffline render and interact", async () => {
    const user = userEvent.setup();
    const company = makeWebCompany();
    const t = getWebsiteTranslations("en");

    render(
      <WebTestProviders>
        <SmoothScroll>
          <Navbar
            company={company}
            pages={[
              { id: "home", visible: true },
              { id: "about", visible: true },
              { id: "contact", visible: true },
            ]}
          />
          <FloatingScrollbar />
          <BackToTop />
          <SocialIcon name="instagram" />
          <LanguageSwitcher variant="footer" />
        </SmoothScroll>
      </WebTestProviders>,
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/en/about");

    await user.click(screen.getAllByTestId("language-switcher-compact")[0]);
    await user.click(screen.getByRole("menuitemradio", { name: /العربية/i }));
    expect(mockNavigation.push).toHaveBeenCalledWith("/ar");

    const closeSpy = vi.fn();
    render(
      <WebTestProviders>
        <MobileMenu isOpen onClose={closeSpy} company={company} />
      </WebTestProviders>,
    );
    await user.click(screen.getByRole("button", { name: t.common.closeMenu }));
    expect(closeSpy).toHaveBeenCalled();

    Object.defineProperty(window, "scrollY", { configurable: true, value: 600 });
    fireEvent.scroll(window);

    render(<WebsiteOffline company={company} locale="en" t={t} />);
    expect(screen.getByText(/Zayed Studio/i)).toBeInTheDocument();
  });

  it("Footer opens LegalModal for terms and rules", async () => {
    const user = userEvent.setup();
    const company = makeWebCompany();

    render(
      <WebTestProviders>
        <Footer company={company} socialLinks={makeSocialLinks()} />
      </WebTestProviders>,
    );

    const termsBtn = screen.getByRole("button", { name: /terms/i });
    await user.click(termsBtn);
    expect(screen.getByText("Standard service terms apply.")).toBeInTheDocument();

    render(
      <WebTestProviders>
        <LegalModal isOpen onClose={vi.fn()} title="Rules Title" content="<p>Safe rule HTML</p>" />
      </WebTestProviders>,
    );
    expect(screen.getByText("Rules Title")).toBeInTheDocument();
  });

  it("SiteProvider, SiteTheme, BrandImage, SiteCode, PreviewBridge & Shared utilities function together", async () => {
    const user = userEvent.setup();
    const company = makeWebCompany();
    const design = makeResolvedConfig().design;

    function HookProbe() {
      const site = useSite();
      const theme = useSiteTheme();
      const tone = useSiteTone();
      const reduced = useSiteReducedMotion();
      const transition = useSiteMotionTransition();
      return (
        <div>
          <span data-testid="probe-currency">{site?.currency}</span>
          <span data-testid="probe-mode">{theme?.mode}</span>
          <span data-testid="probe-tone">{tone}</span>
          <span data-testid="probe-motion">{String(reduced)}:{String(transition.duration ?? "spring")}</span>
        </div>
      );
    }

    render(
      <WebTestProviders design={{ ...design, visitorSwitching: true }}>
        <SiteRegion region="about" tone="light">
          <HookProbe />
          <BrandImage company={company} />
          <ContentImage src="/media/test.jpg" alt="Studio shot" />
          <Reveal>
            <SectionBadge>Featured</SectionBadge>
          </Reveal>
          <ScrollReveal />
          <SiteModeSwitch locale="en" />
          <PreviewBridge adminOrigin="http://localhost:3001" />
        </SiteRegion>
      </WebTestProviders>,
    );

    expect(screen.getByTestId("probe-currency")).toHaveTextContent("BHD");
    expect(screen.getByTestId("probe-tone")).toHaveTextContent("light");
    expect(screen.getByAltText("Studio shot")).toHaveAttribute("src", "/media/test.jpg");
    expect(screen.getByText("Featured")).toBeInTheDocument();

    const modeBtn = screen.getByRole("button", { name: /appearance|mode|theme/i });
    await user.click(modeBtn);

    render(<SiteAnalytics code={{ googleAnalyticsId: "G-12345" }} nonce="n-1" />);
    expect(screen.getByTestId("script-site-analytics")).toBeInTheDocument();

    const { container } = render(
      <SiteCustomCode code={{ headHtml: "<script>window.__x=1</script>" }} nonce="n-1" />,
    );
    expect(container.querySelector("iframe")).toBeInTheDocument();
  });

  it("WebUnifiedErrorPage shows diagnostics and triggers reset and clipboard copy", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const resetSpy = vi.fn();

    render(
      <WebTestProviders>
        <WebUnifiedErrorPage
          statusCode={500}
          error={new Error("Boom backend error")}
          reset={resetSpy}
        />
      </WebTestProviders>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again|retry|reload/i }));
    expect(resetSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Boom backend error"));
  });

  it("CookieConsentBanner and LegalPolicyView render, customize and save preferences", async () => {
    const user = userEvent.setup();
    const company = makeWebCompany();
    window.localStorage.removeItem("company_cookie_consent_v1");

    render(
      <WebTestProviders>
        <LegalPolicyView
          kind="cookies"
          title="Cookie Policy"
          intro="How we use cookies."
          sections={[{ heading: "Essential", body: "Required for security." }]}
          company={company}
        />
        <CookieConsentBanner />
      </WebTestProviders>,
    );

    expect(screen.getByRole("region", { name: /cookie/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /manage preferences/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /save preferences/i }));

    expect(window.localStorage.getItem("company_cookie_consent_v1")).toContain('"essential":true');

    // Verify helper event reopens modal cleanly
    const eventSpy = vi.fn();
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, eventSpy);
    openCookiePreferences();
    expect(eventSpy).toHaveBeenCalled();
    window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, eventSpy);
  });
});
