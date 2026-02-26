# Coding Conventions

**Analysis Date:** 2026-02-26

## Naming Patterns

**Files:**
- HTML files: `index.html`, `autres-prestations.html` - primary pages named descriptively
- Image assets: kebab-case with hyphens (e.g., `salade-de-crevettes-a-la-mangue.jpeg`, `poisson-braise-la-canne-a-sucre-ales.jpg`)
- Media folders: `Medias/` (capitalized root, organized by type: `images/`, `videos/`)

**CSS Classes:**
- BEM-adjacent naming with hyphenated kebab-case
- Single-word root: `.gallery`, `.section`, `.menu`, `.hero`, `.btn`
- Compound names: `.gallery-item`, `.gallery-modal`, `.menu-item-image`, `.featured-dish-content`
- State classes: `.active`, `.scrolled`, `.aos-animate`, `.vegetarian`, `.spicy`
- Modifier classes: `.menu-tab`, `.btn-secondary`, `.btn-reserve`
- Utilities: `.text-center`, `.container`, `.section`
- Examples from `index.html`:
  - `.gallery-item` + `.gallery-item-caption` + `.gallery-item-image`
  - `.menu-item` + `.menu-item-image` + `.menu-item-content` + `.menu-item-price`
  - `.featured-dish` + `.featured-dish-image` + `.featured-dish-content`

**JavaScript Variables:**
- `camelCase` for variables and functions: `currentIndex`, `galleryItems`, `modalMediaContainer`, `menuToggle`
- HTML dataset attributes in camelCase accessed as properties: `item.dataset.index`, `tab.dataset.tab`
- Query selectors use class/ID names as-is: `document.querySelector('.gallery-modal')`
- Event handler function names describe action: `openModal()`, `closeModal()`, `goToNextSlide()`, `resetAutoSlide()`
- Utility function names are verb-first: `populateGallery()`, `updateGallery()`, `startAutoSlide()`, `stopAutoSlide()`
- State variable names are nouns: `intervalId`, `currentIndex`, `isActive`, `headerHeight`

**CSS Custom Properties (CSS Variables):**
- Kebab-case with double-dash prefix: `--color-primary`, `--color-primary-light`, `--color-dark`
- Grouped by purpose: color-*, font-*, shadow-*, border-radius-*, transition-*
- Defined in `:root` pseudo-class for global scope
- Examples:
  - `--color-primary: #C2703D`
  - `--font-heading: 'Cormorant Garamond', serif`
  - `--shadow-soft: 0 8px 30px rgba(0, 0, 0, 0.08)`
  - `--transition-fast: all 0.2s cubic-bezier(...)`

## Code Style

**Formatting:**
- **No formal tool configured** - CSS and JavaScript are hand-formatted
- HTML indentation: 4 spaces for nested elements
- CSS indentation: 8 spaces for rules within selectors
- JavaScript indentation: 4 spaces for nested blocks
- Line length: typically under 100 characters, longer for CSS selectors and rules
- Double quotes for HTML attributes
- Single quotes or template literals in JavaScript strings

**Linting:**
- No `.eslintrc`, `.prettier`, or formal linter configuration detected
- Code follows consistent manual patterns:
  - Semicolons present on all JavaScript statements
  - Consistent operator spacing
  - Consistent brace placement (opening brace on same line)
  - No unused variables cleanup mechanism

**CSS Methodology:**
- Hybrid approach: utility classes + component-based naming
- CSS-in-HTML: all styles in `<style>` block in document head
- No CSS preprocessor (SCSS/LESS) - vanilla CSS with custom properties
- Pseudo-elements used for decoration: `::before`, `::after`, `::after` for underlines
- CSS custom properties (variables) extensively used for theming

## Import Organization

**Not applicable** - This is a single-page application with no module imports. All code is:
- HTML: self-contained document
- CSS: inline in `<style>` tags in document head
- JavaScript: inline in `<script>` tags at end of body
- External resources: loaded via `<link>` and `<script src>` tags for Google Fonts, Font Awesome, AOS library

**External Dependencies:**
- Google Fonts: `https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700`
- Font Awesome 6.0.0: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css`
- AOS (Animate on Scroll): implicit usage via `data-aos` attributes
- Third-party embeds: Optyms booking widget, ReputationHub review widget

## Error Handling

**Strategy:** Defensive null/falsy checks before accessing DOM elements

**Patterns:**
- Existence checks before adding event listeners:
  ```javascript
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (menuToggle && navMenu) {
      menuToggle.addEventListener('click', function() {
          // Handler code
      });
  }
  ```

- Optional chaining for nested property access (not used; explicit checks instead):
  ```javascript
  const answer = item.querySelector('.faq-answer');
  if (answer) {
      answer.style.maxHeight = answer.scrollHeight + "px";
  }
  ```

- No try-catch blocks in analyzed code - assumes DOM operations succeed
- No explicit error logging - relies on browser console if issues occur
- Form submission handlers use simple validation (check for required fields before processing):
  ```javascript
  const date = this.querySelector('#date').value;
  const time = this.querySelector('#time').value;
  const persons = this.querySelector('#persons').value;
  // No validation shown; assumes form inputs are valid
  ```

## Logging

**Framework:** `console` object (native browser API)

**Patterns:**
- Used only in simulated API call context for demonstration:
  ```javascript
  console.log('Reservation submitted:', {
      date,
      time,
      persons
  });
  ```
- No structured logging or log levels (info, warn, error)
- No logging in production-ready UI interactions
- Mainly for debugging/development purposes

## Comments

**When to Comment:**
- Inline comments explain non-obvious logic or complex algorithms
- Example: `// Prevent scrolling while modal is open` explains `document.body.style.overflow = 'hidden'`
- Section headers mark functional groups: `// Gallery functions`, `// Menu Tabs`, `// Mobile Menu Toggle`
- Complex calculations commented: `// Change slide every 5 seconds` explains setTimeout duration
- Commented-out code remains in place (old form code in reservation section)

**JSDoc/TSDoc:**
- Not used - no formal documentation comments
- Function purposes inferred from names and context
- No parameter or return value documentation

## Function Design

**Size:**
- Small functions preferred: most functions 5-20 lines
- Complex operations broken into single-responsibility functions
- Example: `initGallery()` calls `populateGallery()`, `updateGallery()`, `startAutoSlide()` rather than doing all in one

**Parameters:**
- Minimal parameters: most functions take 0-2 parameters
- Index-based navigation: `openModal(index)`, `navigateModalPrev()`, `navigateModalNext()`
- No destructuring of parameters
- No default parameters used

**Return Values:**
- Most event handlers return nothing (void) - side effects only
- State mutations preferred over returning values
- Modal functions: `openModal()` sets classes, updates DOM - no return
- Navigation functions: `goToNextSlide()` updates `currentIndex`, calls `updateGallery()` - no return

## Module Design

**Exports:**
- Not applicable - single-page application with no module system
- Code is procedurally organized within `<script>` blocks
- Global scope pollution: variables like `currentIndex`, `intervalId`, `galleryItems` are function-scoped

**Scope Management:**
- Event listeners wrapped in DOMContentLoaded callbacks to ensure DOM is ready
- All gallery-related state captured in closure variables within gallery event listener
- Menu/header code in separate DOMContentLoaded block (second script tag)
- Intersection Observer callback uses closure for `observer` variable

**Pattern:**
```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Scoped variables
    const galleryItems = [...];
    let currentIndex = 0;

    // Scoped functions
    function populateGallery() { ... }
    function updateGallery() { ... }

    // Initialization
    initGallery();
});
```

---

*Convention analysis: 2026-02-26*
