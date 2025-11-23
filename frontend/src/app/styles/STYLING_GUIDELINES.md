# Styling Guidelines

## Overview

This document outlines the styling approach for the Termageddon frontend, establishing clear guidelines for when to use Tailwind utilities vs custom SCSS.

## Strategy

### Primary Approach: Tailwind Utility Classes
- Use Tailwind utility classes directly in templates for:
  - Spacing (padding, margin)
  - Colors (background, text, border)
  - Typography (font size, weight, line height)
  - Simple layouts (flex, grid basics)
  - Responsive design

### Custom SCSS: Complex Patterns Only
- Use SCSS for:
  - Complex grid/flex layouts that require specific constraints
  - Animations and transitions
  - Component-specific logic (state-based styling)
  - Third-party library overrides (Quill, etc.)
  - Pseudo-elements and pseudo-selectors

### Global Styles (`styles.scss`)
- Tailwind directives
- Third-party library overrides (Quill, etc.)
- Truly global patterns (scrollbars, base typography)
- Semantic color utilities
- Global utility classes (diff styles, mention highlights)

### Shared Component Styles (`shared-components.scss`)
- Reusable component patterns (buttons, forms, avatars)
- Status indicators
- Empty states
- Loading states
- Shared layout patterns

### Component-Specific Styles
- Complex layouts unique to component
- Component-specific animations
- Styles that don't fit shared patterns

## Naming Conventions

### Component-Specific Classes
- Format: `.component-name-element`
- Example: `.draft-detail-panel-header`, `.comment-thread-item`

### Layout Classes
- Format: `.layout-name`
- Example: `.view-mode-grid`, `.comments-grid`, `.three-panel-container`

### Utility Classes
- Use Tailwind where possible
- For custom utilities, use semantic names: `.compact-padding`, `.dense-card`

## Anti-Patterns to Avoid

1. **Don't duplicate Tailwind utilities in SCSS**
   - Bad: Defining `.p-4 { padding: 1rem; }` in component SCSS
   - Good: Use `class="p-4"` in template

2. **Don't use `!important` unless necessary**
   - Only for third-party library overrides
   - Document why it's needed

3. **Don't use `::ng-deep`**
   - Move styles to global stylesheet if truly global
   - Use `ViewEncapsulation.None` if component-specific but needs to pierce encapsulation

4. **Don't use `@apply` for single-use utilities**
   - Use `@apply` only for repeated patterns
   - Prefer Tailwind classes in templates for one-off styling

## Examples

### Good: Tailwind in Template
```html
<div class="flex items-center space-x-2 p-4 bg-white rounded">
  <span class="text-sm font-medium text-gray-700">Label</span>
</div>
```

### Good: Complex Layout in SCSS
```scss
.view-mode-grid {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 0;
  min-height: 0;
  overflow: hidden;
}
```

### Bad: Duplicate Utilities in SCSS
```scss
.my-component {
  .p-4 { padding: 1rem; }  // ❌ Use Tailwind class instead
  .flex { display: flex; }  // ❌ Use Tailwind class instead
}
```
