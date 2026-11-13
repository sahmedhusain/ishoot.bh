"use client";

import * as React from "react";

export function Ripple({ disabled }: { disabled?: boolean }) {
  React.useEffect(() => {
    void import("@material/web/ripple/ripple.js").catch(() => {});
  }, []);
  return React.createElement("md-ripple", { "aria-hidden": true, disabled });
}
