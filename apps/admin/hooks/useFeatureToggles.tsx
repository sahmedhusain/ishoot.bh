"use client";

import * as React from "react";

interface FeatureTogglesContextType {
  features: Record<string, boolean>;
  isFeatureEnabled: (moduleKey: string) => boolean;
}

const FeatureTogglesContext = React.createContext<FeatureTogglesContextType>({
  features: {},
  isFeatureEnabled: () => true, // default to true if provider not found
});

export function FeatureTogglesProvider({
  children,
  initialFeatures,
}: {
  children: React.ReactNode;
  initialFeatures: { moduleKey: string; isEnabled: boolean }[];
}) {
  const [features, setFeatures] = React.useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    initialFeatures.forEach((f) => {
      map[f.moduleKey] = f.isEnabled;
    });
    return map;
  });

  // Effect to sync with initialFeatures if they change from server
  React.useEffect(() => {
    const map: Record<string, boolean> = {};
    initialFeatures.forEach((f) => {
      map[f.moduleKey] = f.isEnabled;
    });
    setFeatures(map);
  }, [initialFeatures]);

  const isFeatureEnabled = React.useCallback(
    (moduleKey: string) => {
      // If it's not in the map, assume it's enabled by default, or you can default to false.
      // Let's default to true if undefined, so core modules don't break.
      return features[moduleKey] ?? true;
    },
    [features]
  );

  return (
    <FeatureTogglesContext.Provider value={{ features, isFeatureEnabled }}>
      {children}
    </FeatureTogglesContext.Provider>
  );
}

export function useFeatureToggles() {
  return React.useContext(FeatureTogglesContext);
}
