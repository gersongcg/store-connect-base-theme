---
name: theme-development
description: Best practices and coding standards for StoreConnect theme development, including Liquid, SCSS, JavaScript, accessibility, architecture, naming, and maintainability.
---

# Theme Development

Use this skill when creating, modifying, reviewing, or refactoring StoreConnect themes.

The goal is to produce production-ready theme code that is:

- Modular
- Accessible
- Maintainable
- Easy to debug
- Consistent with the base theme
- Minimal in abstraction
- Explicit about responsibilities
- Consistent with existing StoreConnect conventions

When working on an existing theme, inspect the surrounding implementation and base theme patterns before introducing a new approach. Prefer consistency with the existing architecture unless there is a clear reason to improve it.

---

# Theme Architecture

## Context

This theme has been built along with the Opaque and San Simeon themes. Download both themes and provide them as context. Multiple standards, issues, and bugs have been resolved across these themes.

## General principles

- Prefer simple, explicit implementations over clever abstractions.
- Keep responsibilities separated.
- Do not introduce abstractions just to reduce a few lines of code.
- Reuse existing theme utilities and patterns where appropriate.
- Do not duplicate functionality that already exists in the base theme.
- Before creating a new utility, check whether an existing helper already solves the problem.
- Keep feature-specific logic close to the feature unless it is genuinely shared.
- Avoid creating large "catch-all" files.
- A feature that has meaningful UI behaviour should generally have its own JS resource.
- Do not move unrelated functionality into a feature simply because the code happens to be nearby.

## Base theme

The base theme is the primary source of truth for existing StoreConnect patterns.

When implementing functionality:

1. Check how the base theme solves similar problems.
2. Reuse established utilities and conventions where appropriate.
3. Extend existing behaviour rather than duplicating it.
4. Preserve compatibility with existing theme APIs and Liquid objects.
5. Only diverge from the base implementation when the theme requires different behaviour.

---

# CSS / SCSS

The theme CSS extends and overrides the base theme SCSS.

The existing code follows a BEM-style naming convention, generally using the `SC-` / `sc-` prefix.

## Naming

Prefer the established `SC-` prefix for theme components and blocks.

Example:

```scss
.SC-ProductCard {}
.SC-ProductCard_image {}
.SC-ProductCard_image-wrapper {}
```

If a component does not use the `SC` prefix, it may still use BEM, but do not introduce inconsistent naming without a reason.

Use modifiers for variations:

```scss
.SC-ProductCard--cio {}
.SC-ProductCard--featured {}
```

Use the prefix consistently within a component.

Do not introduce arbitrary class naming conventions for JavaScript hooks.

## BEM

Keep the hierarchy understandable:

```scss
.SC-ProductCard {
  &_image {}
  &_content {}

  &--featured {}
}
```

Avoid excessive nesting.

Do not reproduce the HTML hierarchy unnecessarily:

```scss
/* Avoid */
.SC-ProductCard {
  .SC-ProductCard_content {
    .SC-ProductCard_title {
      span {}
    }
  }
}
```

Prefer selectors that directly describe the component structure.

**Important:** this is not mandatory, you can use plain and standard CSS declaration. The main rule here is that you keep it clean and maintainable.

## Nesting

SCSS nesting should generally remain shallow.

Avoid nesting more than necessary to express BEM relationships or a clear state.

Prefer:

```scss
.SC-ProductCard {
  padding: var(--sc-spacing-small);

  &_title {
    font-size: var(--sc-font-tiny);
  }
}
```

over deeply nested selectors.

The CSS should remain easy to inspect in browser DevTools and easy to debug.

## Variables

Use existing theme design tokens before introducing new values.

Prefer:

```scss
padding: var(--sc-spacing-small);
color: var(--sc-color-sale);
font-size: var(--sc-font-tiny);
```

over arbitrary hard-coded values when an appropriate token already exists.

If a new value is genuinely required, consider whether it belongs in the theme's design-token system rather than being introduced locally.

## Responsive styles

Follow the breakpoint utilities established by the base theme.

Prefer:

```scss
.SC-ProductCard {
  h3 {
    font-size: var(--sc-font-micro);

    @include bp.md {
      font-size: var(--sc-font-tiny);
    }
  }
}
```

Do not introduce a new breakpoint system when the base theme already provides one.

---

# JavaScript

JavaScript should be modular, feature-focused, and explicit.

## Separation of concerns

Separate:

- DOM selection
- Event handling
- State management
- API requests
- Data transformation
- UI rendering

Do not allow a single function to become responsible for the entire feature.

For example, avoid functions that simultaneously:

1. Read DOM state
2. Make an API request
3. Transform the response
4. Modify multiple unrelated UI elements
5. Manage event listeners

Break those responsibilities into focused functions.

## Feature resources

Create a dedicated JS resource for meaningful new functionality.

For example:

```text
constructor-search.js
constructor-ui-handler.js
fulfilment.js
donation.js
```

Do not place unrelated feature logic into an existing file merely because that file already contains event handlers.

## Event listeners

Prefer event delegation when it makes sense, particularly for dynamically rendered content.

Use stable data attributes for JavaScript hooks.

Prefer:

```html
<button data-fulfilment-method="pickup">
```

and:

```js
element.querySelector('[data-fulfilment-method]')
```

over using presentation classes as JavaScript selectors:

```js
element.querySelector('.pickup-button')
```

Classes describe presentation.

`data-*` attributes describe behaviour or state.

## Initialisation

Theme code can be rendered or re-rendered dynamically.

When functionality can be initialised more than once, make initialisation idempotent.

Use an explicit data attribute where appropriate:

```js
if (element.dataset.initialized) return;

element.dataset.initialized = 'true';
```

Avoid attaching duplicate event listeners.

## DOM changes

When observing DOM changes with `MutationObserver`, ensure that the observer does not react indefinitely to mutations caused by its own code.

Prefer explicit initialization markers or narrowly scoped observers.

Do not observe the entire document when a smaller target is sufficient.

## Selectors

Use the narrowest reliable selector.

If an element is unique to a feature, scope queries to the feature root:

```js
const notice = widget.querySelector('[data-fulfilment-notice]');
```

rather than unnecessarily querying the entire document.

Use `document.querySelector()` only when the element is intentionally global or exists outside the feature's component boundary.

## Functions

Functions should describe what they do.

Prefer:

```js
showFulfilmentNotice(widget, method, blocked, eligible);
```

over generic names such as:

```js
handleThing();
processData();
doUpdate();
```

Avoid functions that require long comments to explain their purpose.

If a function needs a large explanation, consider whether its responsibilities should be split.

## Variables

Use camelCase:

```js
const clearButtons = ...;
const debounceTimer = ...;
const lastQuery = ...;
```

Avoid underscore-prefixed variables unless there is a specific reason to distinguish them.

Avoid unnecessary abbreviations.

Prefer:

```js
const customerState = ...;
```

over:

```js
const cs = ...;
```

## Conditionals

Keep conditionals readable.

Prefer extracting meaningful conditions:

```js
const allMethodsBlocked = eligible > 0 && blocked >= eligible;
```

rather than embedding increasingly complex expressions inside rendering logic.

Avoid deeply nested conditionals.

Use early returns where they make the control flow clearer:

```js
if (!notice) return;

if (!blocked) {
  notice.textContent = '';
  return;
}
```

## API and asynchronous code

Keep API communication separate from UI rendering.

Prefer:

```js
const results = await fetchRecommendations(itemIds);
renderRecommendations(container, results);
```

over combining network communication and DOM construction into one large function.

Handle expected failure states explicitly.

Do not silently swallow errors unless failure is intentionally non-critical.

---

# Liquid

Liquid should remain readable and predictable.

## Data fields

Use lowercase notation when referencing custom data fields.

Prefer:

```liquid
product.data.supplementary_image__c
```

instead of:

```liquid
product.data['Supplementary_Image__c']
```

When the Liquid object supports direct property access, prefer it.

## Liquid structure

Use Liquid blocks to make logic readable.

Prefer:

```liquid
{%- if product.available -%}
  ...
{%- endif -%}
```

over unnecessarily compressed or convoluted expressions.

Avoid deeply nested Liquid conditionals.

When logic becomes difficult to understand, consider extracting a component/template rather than adding more conditions.

## Templates

Keep templates focused on rendering.

Avoid placing large amounts of business logic inside presentation templates.

If the same UI structure is reused, consider creating a reusable component rather than duplicating markup.

Use clear and descriptive template names.

For example:

```text
templates/components/product-card.liquid
templates/components/bestsellers.liquid
```

Nested component directories should follow the theme's supported importer structure.

---

# Accessibility (a11y)

Accessibility is part of feature development, not a final audit step.

Every new or modified template should consider:

- Semantic HTML
- Keyboard navigation
- Focus management
- Screen-reader behaviour
- Accessible names
- Form labels
- Button vs. link semantics
- ARIA usage
- Colour contrast
- Dynamic content announcements
- Reduced-motion considerations where relevant

## Semantic HTML

Use the correct HTML element for the interaction.

Prefer:

```html
<button type="button">
```

for actions.

Prefer:

```html
<a href="/products">
```

for navigation.

Do not use clickable `<div>` elements when a native interactive element is available.

## ARIA

Do not add ARIA attributes simply to satisfy an accessibility checklist.

Prefer native HTML semantics first.

ARIA should communicate states or relationships that cannot otherwise be expressed.

When using dynamic controls, ensure states such as:

```html
aria-expanded="true"
aria-controls="..."
```

remain synchronized with the actual UI state.

## Keyboard interaction

Any interactive functionality available with a mouse should also be usable with a keyboard.

Pay particular attention to:

- Menus
- Modals
- Carousels
- Autocomplete
- Dropdowns
- Search interfaces
- Custom controls

## Colour

Do not rely on colour alone to communicate meaning.

Check text and interactive-state contrast when introducing or modifying colours.

---

# Comments

Comments should explain **why**, not describe obvious code.

Prefer:

```js
// Prevent duplicate initialisation after dynamic rendering.
```

Avoid:

```js
// Set the initialized dataset property to true.
element.dataset.initialized = 'true';
```

Do not write long essays inside source files.

If code requires a large comment to explain what it does, first consider whether the implementation can be made clearer.

Good code should communicate its intent through:

- Function names
- Variable names
- Component boundaries
- CSS selectors
- Data attributes
- Small, focused functions

---

# Dependencies

Do not add a dependency simply because it provides a convenient implementation.

Before introducing a package:

1. Check whether the base theme already provides the functionality.
2. Check whether the browser API can solve the problem.
3. Check whether a small local implementation is clearer.
4. Consider bundle size and theme performance.
5. Consider whether the dependency will be maintained.

Lightweight dependencies are acceptable when they provide meaningful functionality that would otherwise require substantial custom code.

Avoid dependencies for trivial functionality.

---

# Performance

Theme code runs directly in the shopper's browser.

Prefer:

- Minimal DOM queries
- Scoped DOM operations
- Event delegation where appropriate
- Debounced search/input handlers
- Lazy loading for non-critical resources
- Efficient observers
- Avoiding unnecessary reflows
- Avoiding repeated API requests
- Reusing existing resources

Do not optimise prematurely, but avoid obviously expensive patterns.

For example, do not attach individual listeners to hundreds of dynamically generated elements when event delegation provides a simpler solution.

---

# Naming

Names should describe purpose rather than implementation.

Prefer:

```text
constructor-ui-handler.js
product-recommendations.js
fulfilment-notice.js
```

over:

```text
utils2.js
helpers.js
misc.js
new-functions.js
```

For CSS:

```text
SC-ProductCard
SC-ProductCard--cio
SC-ProductCard_image
```

For JavaScript hooks:

```html
data-product-card
data-fulfilment-notice
data-cio-autocomplete-menu
```

Avoid using the same class exclusively for both styling and JavaScript behaviour.

---

# Refactoring

When modifying existing code, improve it incrementally.

Do not perform unrelated refactors in a feature change unless they are necessary to safely implement the feature.

When refactoring:

- Preserve existing behaviour.
- Reduce duplication.
- Improve naming.
- Separate responsibilities.
- Remove dead code.
- Avoid unnecessary abstraction.
- Keep the diff understandable.

A smaller, understandable refactor is preferable to a large architectural rewrite.

---

# Code Review Standards

When reviewing theme code, look specifically for:

### Architecture

- Is the responsibility in the correct resource?
- Is functionality unnecessarily duplicated?
- Is a function doing too much?
- Is there an existing base-theme utility that should be reused?

### CSS

- Is the BEM structure consistent?
- Is nesting unnecessarily deep?
- Are existing design tokens being reused?
- Are classes being incorrectly used as JS hooks?

### JavaScript

- Are data attributes used for JS selectors?
- Are functions focused?
- Are variables camelCase?
- Are underscore-prefixed variables unnecessary?
- Can event delegation simplify the implementation?
- Can the code accidentally initialise twice?
- Could a MutationObserver trigger itself indefinitely?
- Are API and UI responsibilities separated?

### Liquid

- Is the Liquid readable?
- Are custom data fields referenced using lowercase notation?
- Is presentation logic becoming business logic?
- Would a component make the template easier to maintain?

### Accessibility

- Is the correct semantic element being used?
- Can the interaction be completed with a keyboard?
- Are dynamic states exposed correctly?
- Are accessible names present?
- Are colours sufficiently contrasted?
- Is ARIA necessary and correctly synchronised?

### Maintainability

- Does the code explain itself?
- Are comments concise?
- Is the abstraction justified?
- Could another developer debug this quickly?

---

# General Rule

When choosing between two valid implementations, prefer the one that is:

1. Easier to understand
2. Easier to debug
3. More consistent with the base theme
4. More accessible
5. More modular
6. Less dependent on implicit behaviour
7. Less abstract
8. Smaller in scope

The best theme code is not the most clever implementation. It is the implementation another developer can understand and safely modify six months later.

### Locales

Best practice for establishing and maintaining locales:

- The translation key should contain all the strings needed for any feature that doesn't rely on a content block data. 
- Avoid using major HTML tags in translation strings. Use `<strong>`, `<em>`, `<br>`, `<a>`, and `span` only when necessary. 

#### Solutions

If you need to pass dynamic parameters you can use them as follows:

```liquid
{{ 'translation.key' | t: param1: value1, param2: value2 }}
``

or

key: <span class="sc-stock-%{stock_status}">%{stock_status}</span>

output: <span class="sc-stock-in-stock">In Stock</span>