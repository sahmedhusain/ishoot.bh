export const FALLBACK_M3_CSS = `
:root, html.light {
  --m3-color-surface: 253 248 253;
  --m3-color-surface-container-low: 247 242 247;
  --m3-color-surface-container: 241 236 241;
  --m3-color-surface-container-high: 235 230 236;
  --m3-color-on-surface: 28 27 31;
  --m3-color-on-surface-variant: 73 69 79;
  --m3-color-primary: 30 58 138;
  --m3-color-on-primary: 255 255 255;
  --m3-color-primary-container: 219 225 255;
  --m3-color-on-primary-container: 0 23 76;
  --m3-color-secondary-container: 221 225 249;
  --m3-color-on-secondary-container: 21 27 44;
  --m3-color-tertiary-container: 255 216 228;
  --m3-color-on-tertiary-container: 49 17 29;
  --m3-color-error: 186 26 26;
  --m3-color-on-error: 255 255 255;
  --m3-color-error-container: 255 218 214;
  --m3-color-on-error-container: 65 0 2;
  --m3-color-outline: 117 119 128;
  --m3-color-outline-variant: 197 198 208;
  --m3-color-inverse-surface: 49 48 51;
  --m3-color-inverse-on-surface: 244 239 244;
  --m3-color-inverse-primary: 180 197 255;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --m3-color-surface: 18 19 24;
    --m3-color-surface-container-low: 26 27 32;
    --m3-color-surface-container: 30 31 37;
    --m3-color-surface-container-high: 40 42 48;
    --m3-color-on-surface: 227 226 230;
    --m3-color-on-surface-variant: 197 198 208;
    --m3-color-primary: 180 197 255;
    --m3-color-on-primary: 16 42 110;
    --m3-color-primary-container: 40 65 134;
    --m3-color-on-primary-container: 219 225 255;
    --m3-color-secondary-container: 63 70 89;
    --m3-color-on-secondary-container: 221 225 249;
    --m3-color-tertiary-container: 99 59 72;
    --m3-color-on-tertiary-container: 255 216 228;
    --m3-color-error: 255 180 171;
    --m3-color-on-error: 105 0 5;
    --m3-color-error-container: 147 0 10;
    --m3-color-on-error-container: 255 218 214;
    --m3-color-outline: 143 144 154;
    --m3-color-outline-variant: 68 70 79;
    --m3-color-inverse-surface: 227 226 230;
    --m3-color-inverse-on-surface: 48 48 52;
    --m3-color-inverse-primary: 54 91 169;
    color-scheme: dark;
  }
}
`;
