import Script from "next/script";
import type { WebsiteCode } from "@platform/database/website-config";

export function SiteAnalytics({ code }: { code: WebsiteCode }) {
  const scripts: string[] = [];
  if (code.googleAnalyticsId)
    scripts.push(`(function(){var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+${JSON.stringify(code.googleAnalyticsId)};document.head.appendChild(s);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag("js",new Date());gtag("config",${JSON.stringify(code.googleAnalyticsId)});})();`);
  if (code.metaPixelId)
    scripts.push(`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("init",${JSON.stringify(code.metaPixelId)});fbq("track","PageView");`);
  if (code.tiktokPixelId)
    scripts.push(`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var s=d.createElement("script");s.async=!0;s.src="https://analytics.tiktok.com/i18n/pixel/events.js?sdkid="+e;d.head.appendChild(s)};ttq.load(${JSON.stringify(code.tiktokPixelId)});ttq.page()}(window,document,"ttq");`);
  if (!scripts.length) return null;
  return <Script id="site-analytics" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: scripts.join("\n") }} />;
}

export function SiteCustomCode({ code }: { code: WebsiteCode }) {
  if (!code.headHtml && !code.bodyHtml) return null;
  const doc = `<!doctype html><html><head>${code.headHtml}</head><body>${code.bodyHtml}</body></html>`;
  return <iframe title={code.headHtml ? "head" : "body"} aria-hidden tabIndex={-1} srcDoc={doc} sandbox="allow-scripts" referrerPolicy="no-referrer" className="hidden" />;
}
