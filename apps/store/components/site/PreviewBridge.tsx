"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { googleFontsHref, normalizeTheme, themeStylesheet, websiteThemeStylesheet } from "@platform/database/constants/theme";

export function PreviewBridge({ adminOrigin }: { adminOrigin: string }) {
  const router = useRouter();
  React.useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== adminOrigin || !event.data || typeof event.data !== "object") return;
      if (event.data.type === "platform:refresh") router.refresh();
      if (event.data.type === "platform:theme") {
        const theme = normalizeTheme(event.data.theme);
        const style = document.getElementById("company-theme");
        if (style) style.textContent = themeStylesheet(theme) + websiteThemeStylesheet(theme);

        const href = googleFontsHref(theme);
        let link = document.getElementById("preview-fonts") as HTMLLinkElement | null;
        if (href && !link) {
          link = Object.assign(document.createElement("link"), { id: "preview-fonts", rel: "stylesheet" });
          document.head.appendChild(link);
        }
        if (link && href) link.href = href;
      }
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "platform:ready" }, adminOrigin);
    return () => window.removeEventListener("message", onMessage);
  }, [adminOrigin, router]);
  return null;
}


export const StorePreviewBridge = PreviewBridge;
