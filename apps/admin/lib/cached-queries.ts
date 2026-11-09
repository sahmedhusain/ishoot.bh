import { cache } from "react";
import { getCompanySettings, getFeatureToggles } from "@platform/database";

export const getCachedCompanySettings = cache(getCompanySettings);
export const getCachedFeatureToggles = cache(getFeatureToggles);
