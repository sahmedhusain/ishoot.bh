"use client";

import * as React from "react";

/** The official Material ripple attaches to its native button parent. */
export function Ripple({ disabled }: { disabled?: boolean }) {
  React.useEffect(() => {
    // The CSS state layer remains available if the optional animation chunk cannot load.
    void import("@material/web/ripple/ripple.js").catch(() => {});
  }, []);
  return React.createElement("md-ripple", { "aria-hidden": true, disabled });
}
