# ishoot Design System — Brand-to-Code Translation

> Extracted from the [ishoot Brand Guideline](file:///Users/sayed/Desktop/GitHub/ishoot.bh/ishoot/ishoot%20brand%20guideline%20fies/ishoot%20brand%20guideline.pdf) and [Brand Guideline 2](file:///Users/sayed/Desktop/GitHub/ishoot.bh/ishoot/ishoot%20brand%20guideline%20fies/ishoot%20brand%20guideline%202.pdf)

---

## 1. Brand Identity Summary

**ishoot** is a premium cinema production house, commercial photography studio, aerial cinematography provider, DaVinci Resolve color grading suite, and creative studio based in **Bahrain**.

The logo mark is a stylized camera aperture/viewfinder icon combining the letters "i" and "5" (the aperture shape), with camera-lens circle motifs integrated into the wordmark "ishoot". The "oo" in "ishoot" features concentric circle lens elements.

### Logo Variants
| Variant | Usage | File |
|---------|-------|------|
| Primary (Color on light) | Light backgrounds | [ishoot logo svg file.svg](file:///Users/sayed/Desktop/GitHub/ishoot.bh/ishoot/ishoot%20logo%20svg%20file.svg) |
| Icon Only (Color) | Favicon, app icon | [ishoot icon svg file.svg](file:///Users/sayed/Desktop/GitHub/ishoot.bh/ishoot/ishoot%20icon%20svg%20file.svg) |
| White on Dark | Dark/cinematic backgrounds | See brand guideline page 5 |
| Black on Light | Print, high-contrast | See brand guideline page 4 |
| PNG Transparent | General usage | [png-file.png](file:///Users/sayed/Desktop/GitHub/ishoot.bh/ishoot/ishoot%20logo%20files%20(1)/png-file.png) |

### Logo Usage Rules (from Brand Guideline)
- **Primary Logo**: Icon + wordmark together (horizontal lockup)
- **Secondary Logo**: Icon separate from wordmark (can be used independently)
- **Icon Usage**: Use the aperture "i5" mark alone as favicon/icon
- **Breathing Room**: Maintain clear space equal to the icon height around the logo
- **Don'ts**: Never distort, recolor outside palette, rotate, or add effects to the logo

---

## 2. Color System

### 2.1 Official Brand Colors (from Brand Guideline Page 6 & 7)

| Role | Name | HEX | RGB | CMYK | Swatch |
|------|------|-----|-----|------|--------|
| **Primary** | Deep Emerald / Forest Pine | `#014842` | `1, 72, 66` | `91, 49, 67, 45` | 🟢 |
| **Accent** | Radiant Jade / Persian Teal | `#09937F` | `9, 147, 127` | `83, 20, 59, 3` | 🟩 |

### 2.2 Extended Web Palette (Dark Cinematic Interpretation)

For the web ecosystem, these brand colors are extended with obsidian dark surfaces and glass effects, inspired by the **Noqta.tv** aesthetic benchmark:

```
┌─────────────────────────────────────────────────────┐
│  SURFACES (Dark Mode Default)                        │
│  ─────────────────────────────                       │
│  bg-base:       #050807  (deepest cinematic black)   │
│  bg-surface:    #0B1210  (card/modal surfaces)       │
│  bg-elevated:   #111C19  (dropdowns, active rows)    │
│  bg-glass:      rgba(11, 18, 16, 0.75) + blur       │
│                                                      │
│  BORDERS                                             │
│  ───────                                             │
│  border-subtle:  rgba(255, 255, 255, 0.08)           │
│  border-emerald: rgba(9, 147, 127, 0.20)             │
│  border-active:  #09937F (solid accent)              │
│  border-glass:   rgba(9, 147, 127, 0.15)             │
│                                                      │
│  TYPOGRAPHY                                          │
│  ──────────                                          │
│  text-primary:   #F2F6F5  (soft silver-white)        │
│  text-secondary: #9EADA9  (muted caption grey)       │
│  text-accent:    #09937F  (interactive/links)        │
│                                                      │
│  GLOW / EFFECTS                                      │
│  ─────────────                                       │
│  accent-glow: rgba(9, 147, 127, 0.35)                │
│  accent-hover: #0BB49B                               │
│  primary-light: #02665D                              │
│  primary-dark:  #002D29                              │
└─────────────────────────────────────────────────────┘
```

### 2.3 CSS Custom Properties

```css
:root {
  /* Brand Primary */
  --ishoot-primary: #014842;
  --ishoot-primary-light: #02665D;
  --ishoot-primary-dark: #002D29;

  /* Brand Accent */
  --ishoot-accent: #09937F;
  --ishoot-accent-hover: #0BB49B;
  --ishoot-accent-glow: rgba(9, 147, 127, 0.35);

  /* Surfaces */
  --ishoot-surface-base: #050807;
  --ishoot-surface-card: #0B1210;
  --ishoot-surface-elevated: #111C19;
  --ishoot-surface-glass: rgba(11, 18, 16, 0.75);

  /* Borders */
  --ishoot-border-subtle: rgba(255, 255, 255, 0.08);
  --ishoot-border-emerald: rgba(9, 147, 127, 0.2);
  --ishoot-border-active: #09937F;

  /* Typography */
  --ishoot-text-primary: #F2F6F5;
  --ishoot-text-secondary: #9EADA9;
  --ishoot-text-accent: #09937F;
}
```

### 2.4 Gradient Patterns

The brand guideline (page 6) shows a smooth gradient from Primary → Accent used in decorative elements:

```css
/* Brand gradient (decorative bars, hover fills) */
background: linear-gradient(135deg, #014842, #09937F);

/* Radial glow (hero backgrounds, spotlight effects) */
background: radial-gradient(circle at 50% 30%, rgba(9,147,127,0.18), transparent 70%);

/* Cinematic vignette overlay */
background: radial-gradient(ellipse at center, transparent 40%, #050807 100%);
```

---

## 3. Typography System

### 3.1 Brand Fonts (from Brand Guideline Pages 8 & 9)

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| **English Display** | Virtual | Regular (single weight .otf) | Headlines, hero text, brand statements |
| **English UI** | Inter | 300–700 | Body copy, UI elements, tabular data |
| **Arabic All** | IBM Plex Sans Arabic | Thin (100), ExtraLight (200), Light (300), Regular (400), Medium (500), SemiBold (600), Bold (700) | All Arabic text |
| **English Backup** | Nexa | Light, Bold | Secondary English display (brand guideline alternate) |

### 3.2 Font Files Available

```
ishoot brand english and arabic fonts/
├── virtual engilsh font.otf          ← Brand English display font
├── NexaBold.otf                      ← Backup English display
├── NexaLight.otf                     ← Backup English display (light)
└── ibm-plex-sans-arabic/
    ├── IBMPlexSansArabic-Thin.ttf
    ├── IBMPlexSansArabic-ExtraLight.ttf
    ├── IBMPlexSansArabic-Light.ttf
    ├── IBMPlexSansArabic-Regular.ttf
    ├── IBMPlexSansArabic-Medium.ttf
    ├── IBMPlexSansArabic-SemiBold.ttf
    └── IBMPlexSansArabic-Bold.ttf
```

### 3.3 Type Scale (Fluid Responsive)

```css
/* Desktop → Mobile fluid scale */
--text-display:  clamp(3rem, 5vw + 1rem, 6rem);     /* Hero headlines */
--text-h1:       clamp(2.25rem, 3.5vw + 0.5rem, 4rem);
--text-h2:       clamp(1.75rem, 2.5vw + 0.5rem, 3rem);
--text-h3:       clamp(1.25rem, 1.5vw + 0.5rem, 2rem);
--text-body:     clamp(1rem, 0.5vw + 0.75rem, 1.125rem);
--text-caption:  clamp(0.75rem, 0.3vw + 0.6rem, 0.875rem);
--text-overline: 0.75rem;  /* Fixed small, all-caps tracking */
```

### 3.4 RTL/LTR Typography Rules

```
┌──────────────────────────────────────────────────┐
│  When locale === 'ar':                            │
│  • <html dir="rtl" class="font-arabic">          │
│  • Font: IBM Plex Sans Arabic (all weights)       │
│  • Text alignment: natural (right-aligned)        │
│  • Letter spacing: normal (Arabic doesn't use)    │
│  • Ligatures: on                                  │
│                                                    │
│  When locale === 'en':                            │
│  • <html dir="ltr" class="font-english">         │
│  • Font: Virtual (display) + Inter (body)         │
│  • Text alignment: natural (left-aligned)         │
│  • Letter spacing: tight for display, normal body  │
│  • Ligatures: off for headings                    │
└──────────────────────────────────────────────────┘
```

---

## 4. Motion & Animation Standards

### 4.1 Scroll Behaviors

| Pattern | Description | Reference |
|---------|-------------|-----------|
| **Lenis Smooth Scroll** | Inertial smooth scrolling engine across all pages | Apple.com benchmark |
| **Showreel Scale Reveal** | Pinned section scales from `scale(0.85) border-radius:32px` → `scale(1) border-radius:0` as user scrolls | Apple.com product hero |
| **Parallax Layers** | Background elements move at 0.3x–0.5x scroll speed | Noqta.tv |
| **Fade-in on Scroll** | Elements reveal with `opacity:0, y:30` → `opacity:1, y:0` on viewport intersection | Industry standard |

### 4.2 Micro-Interactions

| Element | Trigger | Animation |
|---------|---------|-----------|
| **Nav Links** | Hover | Underline draws from left, accent color text transition 200ms |
| **Cards** | Hover | Subtle lift `translateY(-4px)`, border-emerald glow, shadow spread |
| **Buttons (Primary)** | Hover | Background lightens to `accent-hover`, scale(1.02) |
| **Buttons (Ghost)** | Hover | Border becomes `accent`, text becomes `accent` |
| **Portfolio Cards** | Hover (200ms debounce) | Static poster crossfades to silent video loop over 400ms |
| **Logo Marquee** | Hover | Pause CSS animation, individual logo brightens to full opacity |
| **Service Cards** | Hover | Low-opacity video preview fades behind text |

### 4.3 Transition Tokens

```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 300ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-spring: 600ms cubic-bezier(0.34, 1.56, 0.64, 1);

/* Easing tokens */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 4.4 Keyframe Animations

```css
/* Shutter pulse (logo/aperture breathing) */
@keyframes shutter {
  0%, 100% { opacity: 0.4; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1); }
}

/* Infinite client logo marquee */
@keyframes marquee {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}

/* Staggered text entrance */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 5. Glassmorphism System

The cinematic glass effect is a core visual element, inspired by Noqta.tv's navigation and floating controls:

```css
.glass-surface {
  background: rgba(11, 18, 16, 0.75);      /* --ishoot-surface-glass */
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(9, 147, 127, 0.15); /* border-glass */
  border-radius: 16px;
}

/* Navigation variant */
.glass-nav {
  background: rgba(5, 8, 7, 0.85);
  backdrop-filter: blur(32px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

/* Card hover glow variant */
.glass-card:hover {
  border-color: rgba(9, 147, 127, 0.3);
  box-shadow: 0 0 40px rgba(9, 147, 127, 0.08);
}
```

---

## 6. Component Design Patterns

### 6.1 Buttons

```
┌───────────────────────────────────────────────────┐
│  PRIMARY CTA                                       │
│  bg: #09937F → hover: #0BB49B                     │
│  text: white                                       │
│  padding: 14px 32px                                │
│  border-radius: 12px                               │
│  font-weight: 500                                  │
│  transition: all 300ms ease                        │
│                                                    │
│  SECONDARY / GHOST                                 │
│  bg: transparent                                   │
│  border: 1px solid rgba(255,255,255,0.15)          │
│  text: #F2F6F5 → hover: #09937F                   │
│  border-radius: 12px                               │
│                                                    │
│  BADGE / PILL                                      │
│  bg: rgba(9, 147, 127, 0.12)                      │
│  text: #09937F                                     │
│  padding: 6px 16px                                 │
│  border-radius: 9999px (full pill)                 │
│  font-size: 0.75rem, uppercase, tracking-widest    │
└───────────────────────────────────────────────────┘
```

### 6.2 Cards

```
┌───────────────────────────────────────────────────┐
│  PORTFOLIO CARD                                    │
│  bg: #0B1210                                       │
│  border: 1px solid rgba(9, 147, 127, 0.2)         │
│  border-radius: 16px                               │
│  overflow: hidden (for video/image)                │
│  hover: translateY(-4px), border brightness ↑      │
│                                                    │
│  SERVICE BENTO CARD                                │
│  bg: #0B1210                                       │
│  border: 1px solid rgba(255, 255, 255, 0.08)      │
│  border-radius: 20px                               │
│  padding: 32px                                     │
│  hover: video preview behind text                  │
│                                                    │
│  EQUIPMENT CARD                                    │
│  bg: #111C19                                       │
│  border: none                                      │
│  border-radius: 12px                               │
│  Tabular layout: model name + specs                │
└───────────────────────────────────────────────────┘
```

### 6.3 Form Elements

```
┌───────────────────────────────────────────────────┐
│  TEXT INPUT                                        │
│  bg: #0B1210                                       │
│  border: 1px solid rgba(255, 255, 255, 0.08)      │
│  border-radius: 12px                               │
│  text: #F2F6F5                                     │
│  placeholder: #9EADA9                              │
│  focus: border-color → #09937F                     │
│  focus: ring → 0 0 0 3px rgba(9,147,127,0.2)      │
│  padding: 14px 18px                                │
│                                                    │
│  SELECT / DROPDOWN                                 │
│  Same as text input + chevron icon                 │
│  Dropdown panel: bg-elevated (#111C19)             │
│                                                    │
│  MULTI-SELECT PILLS                               │
│  Inactive: bg transparent, border-subtle           │
│  Active: bg rgba(9,147,127,0.15), text accent      │
│  border-radius: 9999px                             │
└───────────────────────────────────────────────────┘
```

---

## 7. Invoice Template Design

Based on the [invoice templates](file:///Users/sayed/Desktop/GitHub/ishoot.bh/ishoot/2%20invoice%20files/):

```
┌─────────────────────────────────────────────────────┐
│  HEADER BAR: Solid #014842 (Deep Emerald)           │
│  ┌──────────────────────────────────────────────┐   │
│  │  [White Logo]          Invoice #ISH-2024-001 │   │
│  │  ishoot Production House                      │   │
│  │  CR: XXXXX | VAT: XXXXXXXXXX                  │   │
│  │  Manama, Kingdom of Bahrain                   │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  CLIENT DETAILS          │  INVOICE DETAILS          │
│  Name: ___               │  Date: ___                │
│  Company: ___            │  Due: ___                 │
│  Email: ___              │  Currency: BHD            │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  # │ Description      │ Qty │ Rate   │ Total │   │
│  │────┼─────────────────┼─────┼────────┼───────│   │
│  │  1 │ Video Production │  1  │ 500.000│500.000│   │
│  │  2 │ Color Grading    │  2  │ 200.000│400.000│   │
│  │────┼─────────────────┼─────┼────────┼───────│   │
│  │                  Subtotal:  │        │900.000│   │
│  │                  VAT (10%): │        │ 90.000│   │
│  │                  TOTAL:     │        │990.000│   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  BANK DETAILS                                        │
│  Bank: ___                                           │
│  IBAN: ___                                           │
│  Account: ___                                        │
│                                                      │
│  FOOTER: #09937F accent bar                          │
│  "Thank you for your business"                       │
└─────────────────────────────────────────────────────┘
```

Key rules:
- **BHD (Bahraini Dinar)** uses **3 decimal places** (e.g., 500.000 BHD)
- **VAT rate**: 10% (Bahrain standard)
- **Language toggle**: Full bilingual support (EN/AR)
- **Arabic invoices**: Right-aligned, IBM Plex Sans Arabic font
- **English invoices**: Left-aligned, Inter font
- **PDF export**: Must match brand colors exactly

---

## 8. Responsive Breakpoints

```css
/* Tailwind v4 defaults with custom additions */
--breakpoint-sm: 640px;   /* Mobile landscape */
--breakpoint-md: 768px;   /* Tablet portrait */
--breakpoint-lg: 1024px;  /* Tablet landscape / small laptop */
--breakpoint-xl: 1280px;  /* Desktop */
--breakpoint-2xl: 1536px; /* Large desktop */
--breakpoint-4k: 2560px;  /* UltraWide / 4K */
```

---

## 9. Spacing & Layout Grid

```
Container widths: max-w-7xl (1280px) for content, full-bleed for hero/video
Padding scale: 4px increments (Tailwind default)
Section spacing: py-20 (80px) desktop, py-12 (48px) mobile
Card gaps: gap-6 (24px) standard, gap-8 (32px) for larger grids
```

---

## 10. Iconography

- Use **Lucide React** as the primary icon library (clean, minimal, consistent)
- Icon size: 20px for inline, 24px for standalone, 16px for dense UI
- Icon color: `text-secondary` default, `text-accent` for interactive
- Custom icons: Camera aperture mark from brand SVG for loading states
