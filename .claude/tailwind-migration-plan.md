# Tailwind CSS Migration Plan

**Goal:** Replace all core SCSS with Tailwind CSS v4. Remove `normalize.css`, the base elements layer, the utilities layer, and the deprecated CMS layout classes. Theme components follow after the core is clean.

**Starting point:** Tailwind v4 is already in `package.json` at the repo root (`@tailwindcss/vite: ^4.3.1`, `tailwindcss: ^4.3.1`). The build system currently lives in `templates/resources/` and uses **esbuild**, not Vite.

---

## Phase 1 — Switch the build from esbuild to Vite

The `scs-client-repo-template` repo (`/Users/gchavez/Documents/GitHub/scs-client-repo-template`) already has the Vite setup we want to replicate. Key parts to copy over:

**`vite.config.js`** (place at `templates/resources/vite.config.js`):
- Dynamic entry discovery via `fast-glob` for `src/styles/*.{css,scss}` and `src/scripts/*.js`
- Output: `dist/styles/`, `dist/scripts/`, `dist/assets/`
- Two custom plugins already proven in that repo:
  - `inline-chunks-and-wrap-iife` — keeps scripts in IIFE scope
  - `custom-flat-manifest` — produces `manifest.json` compatible with the Liquid layer

Add `@tailwindcss/vite` to the plugins array:

```js
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    inlineChunksAndWrapIife(),
    customFlatManifest(),
  ],
  // ...
})
```

**`package.json`** at `templates/resources/`:
- Add `vite`, `@tailwindcss/vite`, `tailwindcss` (v4), `fast-glob`
- Keep `sass-embedded` for the SCSS files still in flight during migration
- Remove `esbuild`, `esbuild-sass-plugin`, `esbuild-plugin-manifest` once migration is complete
- Keep `postcss`, `autoprefixer`, `postcss-nested` — Vite uses them transparently

**Build scripts** replace the esbuild runner:
```json
"dev":   "vite build --watch",
"build": "vite build"
```

---

## Phase 2 — Add the Tailwind CSS entry point

Create `templates/resources/src/styles/packs/theme.css` alongside the existing `theme.scss`. This becomes the new main entry.

```css
/* templates/resources/src/styles/packs/theme.css */
@import "tailwindcss";

/* Design tokens — map existing SCSS settings to CSS custom properties */
@theme {
  /* Breakpoints (match base/settings/breakpoints.scss) */
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1400px;
  --breakpoint-2xl: 1700px;

  /* Spacing scale (match base/settings/spacing.scss) */
  --spacing-micro:  3px;
  --spacing-tiny:   8px;
  --spacing-small:  12px;
  --spacing-base:   16px;
  --spacing-medium: 24px;
  --spacing-large:  32px;
  --spacing-xlarge: 48px;
  --spacing-huge:   80px;

  /* Typography (match base/settings/font.scss) */
  --font-size-tiny:    14px;
  --font-size-small:   15px;
  --font-size-base:    16px;
  --font-size-medium:  18px;
  --font-size-large:   20px;
  --font-size-xlarge:  24px;
  --font-size-huge:    30px;
  --font-size-gigantic: 45px;
}

/* Carry-over component CSS that isn't migrated yet */
@import "../base/core.scss";           /* remove imports as each layer is done */
@import "../theme/components.scss";
```

Vite will process the `.css` file through `@tailwindcss/vite` and also resolve the SCSS `@import`s via `sass-embedded`. This hybrid approach lets you migrate one layer at a time without a big-bang rewrite.

---

## Phase 3 — Normalization (first to remove)

**What to replace:** `base/dependencies.scss` → `normalize.css` import, plus all of `base/elements/` (14 files).

Tailwind v4's `@import "tailwindcss"` includes **Preflight** — a modern reset built on top of Normalize. This covers:
- Box-sizing (`all.scss`)
- Body base styles (`body.scss`)
- Button resets (`button.scss`)
- Form base (`form.scss`)
- Image defaults (`img.scss`)
- Typography base (`typography.scss`)
- Anchor defaults (`anchor.scss`)
- HR, code, dl, svg, label, paragraph, menu, address

**Steps:**
1. Remove `normalize.css` from `dependencies.scss`
2. Compare each file in `base/elements/` against Preflight — copy any rule Preflight does NOT cover into a `@layer base { }` block inside `theme.css`
3. Delete the element SCSS files one by one as they are verified clean
4. Remove the `@import 'base/elements/*'` lines from `base/core.scss`

Key things Preflight does NOT handle that need a manual `@layer base`:
- `base/elements/body.scss`: flex layout for sticky footer, `overflow: hidden`
- `base/elements/body.scss`: any SC-specific body classes

---

## Phase 4 — CMS content blocks (second to remove)

**What to replace:** all of `base/cms/` (6 files) and `base/structural/` (6 files).

These are the highest-value targets because:
- `base/cms/layout.scss` is already **DEPRECATED** — replace with Tailwind grid/flex utilities directly in Liquid templates
- `base/structural/container.scss` maps cleanly to a Tailwind `@layer components` custom class
- `base/structural/grid.scss` and `card-grid.scss` become `grid`, `grid-cols-*`, `gap-*`

**CMS layout migration map:**

| Old SCSS class | Tailwind replacement |
|---|---|
| `CB-even-distribution` | `grid grid-cols-[auto-fill_minmax(240px,1fr)]` or custom `grid-cols-auto-fill` |
| `CB-two-column` | `grid grid-cols-2` |
| `CB-three-column` | `grid grid-cols-3` |
| `CB-four-column` | `grid grid-cols-4` |
| `CB-one-third-two-thirds` | `grid grid-cols-[1fr_2fr]` |
| `CB-two-thirds-one-third` | `grid grid-cols-[2fr_1fr]` |

**Container migration:** Define `.sc-container` in `@layer components`:
```css
@layer components {
  .sc-container {
    @apply mx-auto px-4 w-full max-w-[1400px];
  }
  .sc-container--skinny   { @apply max-w-[760px]; }
  .sc-container--spacious { @apply max-w-[1600px]; }
  .sc-container--expanded { @apply max-w-[1920px]; }
  .sc-container--capsule  { @apply rounded-2xl overflow-hidden; }
}
```

**Steps:**
1. Migrate `base/cms/content-block.scss` — typically just `width: 100%; margin: 0` — remove it
2. Migrate `base/cms/alignment.scss` → `text-left`, `text-center`, `text-right`, `items-start`, etc.
3. Migrate `base/cms/container.scss` → `@layer components` in `theme.css`
4. Migrate `base/structural/container.scss` → same `@layer components`
5. Remove `base/cms/layout.scss` entirely (deprecated — just delete it and grep Liquid templates for any surviving class usage)
6. Migrate `base/structural/grid.scss` → remove; apply Tailwind grid classes in templates
7. Migrate `base/structural/responsive-iframe.scss` → `aspect-video overflow-hidden` or `@layer components`
8. Migrate `base/structural/scroll.scss` → `overflow-auto scroll-smooth` etc.

---

## Phase 5 — Utilities layer (third to remove)

`base/utilities/` (17+ files, 92 KB) is the layer most directly replaceable by Tailwind out of the box. Most of these files are custom versions of what Tailwind already provides:

| Utility file | Tailwind coverage |
|---|---|
| `alignment.scss` | `text-*`, `items-*`, `justify-*` |
| `background.scss` | `bg-*` |
| `border.scss` | `border`, `border-*`, `rounded-*` |
| `cursor.scss` | `cursor-*` |
| `depth.scss` | `z-*` |
| `dimensions.scss` | `w-*`, `h-*`, `min-*`, `max-*` |
| `display.scss` | `block`, `inline`, `flex`, `grid`, `hidden` |
| `flexbox.scss` | `flex-*`, `items-*`, `justify-*`, `gap-*` |
| `focus.scss` | `focus:ring-*`, `focus:outline-*` |
| `gap.scss` | `gap-*` |
| `grid.scss` | `grid-cols-*`, `col-span-*` |
| `outline.scss` | `outline-*` |
| `overflow.scss` | `overflow-*` |
| `pointer.scss` | `pointer-events-*` |
| `position.scss` | `relative`, `absolute`, `fixed`, `sticky`, `inset-*` |
| `shadow.scss` | `shadow-*` |
| `spacing.scss` | `m-*`, `p-*`, `mx-*`, `px-*`, etc. |
| `state.scss` | `hover:*`, `focus:*`, `active:*` |
| `transform.scss` | `translate-*`, `scale-*`, `rotate-*` |
| `typography.scss` | `font-*`, `text-*`, `leading-*`, `tracking-*` |
| `width.scss` | `w-*`, `w-1/2`, `w-1/3`, etc. |
| `rich-text.scss` | `prose` via `@tailwindcss/typography` plugin (add if needed) |

**Steps:**
1. Grep Liquid templates for each utility class name to understand actual usage
2. Swap classes in Liquid files to Tailwind equivalents
3. Delete SCSS utility files once all usages are replaced
4. Remove `base/utilities.scss` aggregator and its import from `theme.scss`

---

## Phase 6 — Theme components (last)

After core is clean, tackle `theme/components/` (77 files) one component at a time. Priority order:

1. Simple UI atoms: `badge`, `tag`, `loader`, `icon`, `overlay`
2. Text/link patterns: `link`, `link-list`, `heading-link`, `breadcrumb`
3. Form controls: `button`, `field`, `label`, `checkbox`, `radio`, `select`, `switch`
4. Layout containers: `card`, `panel`, `section`, `screen`, `modal`
5. Navigation: `nav`, `nav-link`, `nav-list`, `navbar`, `page-nav`
6. Product UI: `product-price`, `product-variant`, `product-card`, `product-display`
7. E-commerce flows: `cart`, `cart-item`, `quantity-picker`, `add-to-cart`, `order-total`

For each component, choose one of:
- **Delete + Tailwind classes in templates** — for simple layout-only components
- **`@layer components` block in `theme.css`** — for multi-property components that are genuinely reused
- **Keep as SCSS** — for complex components with heavy theming that are risky to rewrite

---

## Recommended sequence

```
Week 1: Phase 1 + 2  (Vite config + Tailwind entry point, build runs both in parallel)
Week 2: Phase 3      (Normalization — remove normalize.css + base/elements/)
Week 3: Phase 4      (CMS content blocks + structural layouts)
Week 4: Phase 5      (Utilities layer)
Week 5+: Phase 6     (Theme components, one per session)
```

---

## Key files to watch

| File | Role |
|---|---|
| `templates/resources/src/styles/packs/theme.scss` | Current main entry — keep alive until `theme.css` is feature complete |
| `templates/resources/src/styles/packs/theme.css` | New Tailwind entry (create in Phase 2) |
| `templates/resources/src/styles/base/core.scss` | Remove `@import` lines here as each layer is migrated |
| `templates/resources/src/styles/base/dependencies.scss` | Remove `normalize.css` in Phase 3 |
| `templates/resources/src/styles/base/cms/layout.scss` | Delete outright in Phase 4 (already deprecated) |
| `templates/resources/vite.config.js` | Create in Phase 1 (copy from scs-client-repo-template) |
| `templates/resources/package.json` | Update in Phase 1 |

---

## Notes

- Tailwind v4 no longer uses `tailwind.config.js` — configuration lives in `@theme {}` blocks inside CSS
- `@tailwindcss/vite` replaces the need for a separate `postcss.config.js`
- The color system (HSL-based CSS custom properties) is already close to Tailwind v4's `@theme` format — map `--sc-color-primary-h/s/l` to `--color-primary: hsl(var(...))` etc.
- The `scs-client-repo-template` Vite plugins (`inline-chunks-and-wrap-iife`, `custom-flat-manifest`) are battle-tested for the StoreConnect platform manifest format — copy them verbatim
