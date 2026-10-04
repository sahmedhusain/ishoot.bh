import { cache } from "react";
import { getCompanySettings, getFeatureToggles } from "@ishoot/database";

/** Request-scoped memoized reads shared by the dashboard layout and its pages. */
export const getCachedCompanySettings = cache(getCompanySettings);
export const getCachedFeatureToggles = cache(getFeatureToggles);
