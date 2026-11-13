"use client";

import * as React from "react";

const UTM_COOKIE = "platform-utm";

export function UtmCapture() {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const campaign = params.get("utm_campaign");
    if (!campaign || !/^[A-Za-z0-9_-]{1,60}$/.test(campaign)) return;
    const clean = (v: string | null) => (v && /^[A-Za-z0-9._-]{1,60}$/.test(v) ? v : "");
    const value = encodeURIComponent(JSON.stringify({ campaign: campaign.toLowerCase(), source: clean(params.get("utm_source")), medium: clean(params.get("utm_medium")) }));
    document.cookie = `${UTM_COOKIE}=${value}; Max-Age=${30 * 86400}; Path=/; SameSite=Lax`;
  }, []);
  return null;
}
