export const APPEARANCE_OPTIONS = {
  density: ["comfortable", "compact"],
  corners: ["brand", "rounded", "square"],
  borders: ["subtle", "defined"],
  motion: ["system", "reduced", "none"],
  dialogPlacement: ["center", "side"],
  backdrop: ["blur", "dim"],
} as const;

export type AdminAppearance = {
  [
    K in keyof typeof APPEARANCE_OPTIONS
  ]: (typeof APPEARANCE_OPTIONS)[K][number];
};
export const APPEARANCE_STORAGE_KEY = "platform_admin_appearance";
export const DEFAULT_APPEARANCE: AdminAppearance = {
  density: "comfortable",
  corners: "brand",
  borders: "subtle",
  motion: "system",
  dialogPlacement: "center",
  backdrop: "blur",
};
export const ADMIN_DESIGN_PRESETS = {
  balanced: DEFAULT_APPEARANCE,
  spacious: { ...DEFAULT_APPEARANCE, corners: "rounded" },
  focused: {
    ...DEFAULT_APPEARANCE,
    density: "compact",
    corners: "square",
    borders: "defined",
    backdrop: "dim",
  },
} satisfies Record<string, AdminAppearance>;

export function normalizeAdminAppearance(value: unknown): AdminAppearance {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    Object.entries(APPEARANCE_OPTIONS).map(([key, options]) => [
      key,
      (options as readonly unknown[]).includes(input[key])
        ? input[key]
        : DEFAULT_APPEARANCE[key as keyof AdminAppearance],
    ]),
  ) as AdminAppearance;
}

export function appearanceBootstrapScript() {
  return `try{var a=JSON.parse(localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_KEY)})||"null")||{};var o=${JSON.stringify(APPEARANCE_OPTIONS)};var f=${JSON.stringify(DEFAULT_APPEARANCE)};for(var k in o)document.documentElement.dataset[k]=o[k].includes(a[k])?a[k]:f[k]}catch{}`;
}
