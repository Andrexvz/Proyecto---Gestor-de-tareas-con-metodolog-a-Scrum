---
name: Agile Velocity System
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#d2bbff'
  on-secondary: '#3f008e'
  secondary-container: '#6001d1'
  on-secondary-container: '#c9aeff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#007d55'
  on-tertiary-container: '#bdffdb'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.005em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system targets fast-moving engineering leads, agile product managers, and enterprise Scrum teams executing high-velocity development cycles. The interface balances high-density utility with modern architectural precision, directly influenced by developer-first workflows and clean, modular Scandinavian SaaS design.

### Design Movement: Modern Precision & Layered Utility
- **Aesthetic Core:** High-density, keyboard-first, and ultra-crisp. Visual clutter is stripped away in favor of tight typography scales, razor-sharp status delineation, and structured spatial grids.
- **The AI Duality:** The platform operates in two synchronous modes:
  1. *Deterministic Execution (Scrum Engine):* Governed by deep slates, cool grays, and precise operational badges.
  2. *Generative Augmentation (AI Assistant):* Signaled through radiant violet/purple accents, contextual micro-diffusions, and dedicated inline conversational panes.
- **Tone:** Authoritative, responsive, calm under pressure, and frictionless.

## Colors

The palette is engineered around dark-mode operational stamina, reducing eye fatigue during continuous backlog refinement, sprint orchestration, and live ticket tracking.

### Core Canvas & Neutrals
- **Surface Canvas (App Base):** `#0B0F17` (Deep Obsidian)
- **Layer 01 Surface (Boards, Panels, Sidebars):** `#0F172A` (Rich Slate)
- **Layer 02 Surface (Cards, Row Containers, Modals):** `#1E293B` (Elevated Charcoal Slate)
- **Border Subtle:** `#334155` (Subtle boundary definition)
- **Border Default:** `#475569` (Interactive input and container borders)

### Primary & Generative Accents
- **System Interactive Accent:** `#2563EB` (Primary Royal), `#3B82F6` (Hover/Active)
- **AI Engine Accent:** `#7C3AED` (Deep Violet), `#8B5CF6` (AI Focus Ring & Active State), `#A855F7` (Generative Highlights)

### Scrum Status Semantics
- **Backlog / To Do:** Slate `#64748B` (Background tint: `rgba(100, 116, 139, 0.12)`)
- **In Progress:** Royal Azure `#3B82F6` (Background tint: `rgba(59, 130, 246, 0.12)`)
- **Review / Testing:** Amethyst Violet `#8B5CF6` (Background tint: `rgba(139, 92, 246, 0.12)`)
- **Done / Released:** Emerald Green `#10B981` (Background tint: `rgba(16, 185, 129, 0.12)`)

### Priority Signals
- **Critical / Urgent (Alta):** Crimson Red `#F43F5E`
- **Medium (Media):** Amber Gold `#F59E0B`
- **Low (Baja):** Sage Slate `#10B981`

## Typography

Typography prioritizes information density and horizontal compactness, optimizing display capabilities for large multi-column Kanban matrices and nested backlog hierarchies.

- **Primary Interface Font:** `Inter` handles all structural levels, title headings, body metrics, and modal narratives. Its neutral geometry remains legible even at small `12px` and `13px` enterprise body sizes.
- **Monospaced Utility Font:** `JetBrains Mono` is reserved for ticket identifiers (e.g., `SCRUM-1048`), sprint velocity indicators, story points, branch names, and AI execution tokens.
- **Line Heights:** Tightly clamped to prevent cards and table rows from ballooning vertically.

## Layout & Spacing

The layout is built upon an adaptive fluid work area pinned by an anchored collapsible navigation rail.

### Spatial System
- **Base Modular Unit:** 4px micro-grid. All internal padding, component heights, and gaps must resolve to multiples of 4px (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 12px, `space-lg` = 16px, `space-xl` = 24px).
- **Kanban Board Mechanics:** Columns maintain a fluid flex-basis (minimum 280px, maximum 380px) with fixed `0.75rem` (12px) gaps between swimlanes to preserve high visual density without content clipping.
- **Split-Pane Architecture:** When the AI Assistant or issue detail drawer opens, the main canvas compresses smoothly rather than being overlaid, retaining full user context.

### Responsive Breakpoints
- **Desktop (1280px+):** Full 4-6 column sprint boards, fixed left global rail (56px collapsed / 240px expanded), active AI chat drawer docked right (360px).
- **Tablet (768px - 1279px):** Horizontal scrolling swimlanes or switchable list views; AI Assistant converts to a floating bottom sheet or fly-out overlay.
- **Mobile (<768px):** Single-column stack with segmented tabs switching between Kanban stages (To Do / In Progress / Testing / Done). Global margins contract to `margin-mobile` (16px).

## Elevation & Depth

This system avoids heavy, distracting blur drop shadows in favor of tonal layering and structured luminosity.

### Surface Elevation Levels
- **Level 0 (Base Canvas `#0B0F17`):** Unclickable background canvas for the workspace shell.
- **Level 1 (Docked Surfaces `#0F172A`):** Board containers, global side navigation, and sticky list headers. Delineated by a 1px border (`#1E293B`).
- **Level 2 (Interactive Cards `#1E293B`):** Draggable sprint cards, table rows, and input groups. Shadow: `0 1px 2px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)`.
- **Level 3 (Overlays & Drawers `#1E293B`):** Modals, dropdown command palettes (CMD+K), and issue peek drawers. Shadow: `0 12px 28px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px #334155`.

### AI Contextual Elevation
AI-generated cards, suggestions, or chat inputs feature an ambient violet perimeter glow instead of standard gray borders:
- Static: `box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.35)`
- Hover/Generating: `box-shadow: 0 0 16px -2px rgba(124, 58, 237, 0.25), 0 0 0 1px #8B5CF6`

## Shapes

The interface balances sharp industrial utility with ergonomic modern rounding.

- **Standard Elements (0.5rem / 8px):** Inputs, standard buttons, issue cards, filter chips, and code snippets.
- **Containers & Modals (`rounded-lg` = 1rem / 16px):** Dialog windows, slide-over issue drawers, sprint retrospective summary boards, and AI floating prompt panels.
- **Status & Counter Badges (Pill / Full Round):** Story point counters, priority indicators, and member avatar rings use circular pills (`9999px`) to visually contrast against square-edged task cards.

## Components

### Buttons
- **Primary:** Solid `#2563EB` fill, white text, 8px border radius, height 32px (compact) or 36px (default). Active state deepens to `#1D4ED8`.
- **AI Action Button:** Gradient border or solid `#7C3AED` with micro sparkle icon prefix. On click/processing, triggers an animated violet pulse ring.
- **Ghost/Tertiary:** Transparent fill, `#94A3B8` label, hover surface `#1E293B` with `#F8FAFC` label.

### Task Cards (Kanban / Backlog)
- Surface `#1E293B` with a 1px `#334155` border.
- Layout: Top bar displays key label (`SCRUM-104`) in `JetBrains Mono` alongside priority badge; center displays task title in `Inter 13px/600`; bottom row aligns member avatars, story estimate pill, and AI summary badge.
- Dragging state: Card rotates by 1.5deg, opacity set to 0.95, elevation raises to Level 3 with a royal blue bounding highlight.

### Chips & Badges
- **Priority Badges:** High-contrast dot indicator paired with uppercase 10px tracking label:
  - *Alta:* Dot `#F43F5E`, text `#FDA4AF`, background `rgba(244, 63, 94, 0.1)`.
  - *Media:* Dot `#F59E0B`, text `#FCD34D`, background `rgba(245, 158, 11, 0.1)`.
  - *Baja:* Dot `#10B981`, text `#6EE7B7`, background `rgba(16, 185, 129, 0.1)`.
- **Status Badges:** Solid 1px tinted border matching status semantic tone with semitransparent fill.

### Input Fields & Search Bars
- Background `#0F172A`, border 1px `#334155`, text `#F8FAFC`.
- Focus State: Border color `#3B82F6` with `0 0 0 1px #3B82F6` ring.
- Global Command Palette (CMD+K): Centered modal with search input supporting automated natural language prompts for AI actions.

### AI Assistant Inline Panel & Modals
- Chat and assistant panels use an interior frosted border tint (`rgba(139, 92, 246, 0.2)`).
- Generative text stream renders with a trailing violet indicator dot before settling into clean Inter typography.
- Suggested prompt chips: `#1E293B` background with purple hover borders (`#8B5CF6`).

### Empty & Loading States
- **Loading:** Shimmering skeletons using a gradient wave moving from `#1E293B` to `#334155` back to `#1E293B`.
- **Empty Sprints:** Centered slate vector wireframe with subdued headline and a single actionable primary button (e.g., "Create First Story" or "Generate Backlog with AI").