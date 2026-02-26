# Codebase Structure

**Analysis Date:** 2026-02-26

## Directory Layout

```
restaurantlacanneasucre.com/
├── index.html                          # Main website (hero, about, gallery, menu, reservations, etc.)
├── autres-prestations.html             # Services/amenities page
├── Medias/                             # Media assets directory
│   ├── images/                         # Restaurant images
│   │   ├── salade-de-crevettes-a-la-mangue.jpeg
│   │   ├── salade-de-crevettes-a-la-mangue-120X120.jpeg
│   │   ├── Ndole-boeuf-restaurant-la-canne-a-sucre-ales.jpg
│   │   ├── cocktail-signature.jpg
│   │   ├── veau-bannanes-plantain-focus.jpg
│   │   ├── poisson-braise-la-canne-a-sucre-ales.jpg
│   │   ├── poisson-braise.jpg
│   │   ├── Tartare-de-poisson-frais.jpeg
│   │   ├── Samoussas-aux-legumes.jpeg
│   │   ├── accras-de-morue.jpeg
│   │   ├── ambiance-restaurant-la-canne-a-sucre-Ales.jpg
│   │   ├── ambiance-restaurant-la-canne-a-sucre-Ales-600X400.jpg
│   │   ├── chef-jean-Arnaud-restaurant-la-canne-a-sucre-ales.png
│   │   ├── armelle-yanga.png
│   │   ├── madame-chantale-pelowski.jpg
│   │   ├── IMG_7563-copie-scaled.jpg
│   └── videos/                         # Restaurant video content
│       └── restaurant-ambiance.mp4
├── .planning/
│   └── codebase/                       # GSD codebase documentation
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       ├── CONVENTIONS.md
│       ├── TESTING.md
│       ├── STACK.md
│       ├── INTEGRATIONS.md
│       └── CONCERNS.md
├── .git/                               # Git repository
├── PRD.txt                             # Product requirements (French)
├── PRD_english.txt                     # Product requirements (English)
├── acces-gestion-resa-base44.txt       # Notes on Base44 management app access
├── appli-base44-de-gestion-des-reservations.txt  # Base44 app documentation notes
└── next-actions.txt                    # Task notes
```

## Directory Purposes

**Root:**
- Purpose: Contains main website files and project documentation
- Contains: HTML pages, configuration notes, requirements documents
- Key files: `index.html` (primary entry point), `autres-prestations.html` (secondary page)

**Medias/images/:**
- Purpose: Store restaurant photography assets for display across website sections
- Contains: JPEG and PNG image files (product shots, team photos, ambiance photos, food dish images)
- Key files:
  - `salade-de-crevettes-a-la-mangue.jpeg` - appetizer image
  - `Ndole-boeuf-restaurant-la-canne-a-sucre-ales.jpg` - main course
  - `cocktail-signature.jpg` - beverage image
  - `poisson-braise-la-canne-a-sucre-ales.jpg` - signature dish
  - Chef/team photos: `chef-jean-Arnaud-*.png`, `armelle-yanga.png`, `madame-chantale-pelowski.jpg`
  - Ambiance shots: `ambiance-restaurant-la-canne-a-sucre-Ales.jpg`

**Medias/videos/:**
- Purpose: Store video content for gallery display
- Contains: MP4 video files
- Key files: `restaurant-ambiance.mp4` - looping restaurant atmosphere video

**.planning/codebase/:**
- Purpose: Centralized documentation for GSD workflow
- Contains: Architecture, structure, conventions, testing patterns, tech stack analysis, integrations, concerns
- Key files: GSD reference documents (ARCHITECTURE.md, STRUCTURE.md, etc.)

## Key File Locations

**Entry Points:**
- `index.html`: Main restaurant website (3447 lines) - hero section, about, gallery, menu, reservations, testimonials, team, FAQ, contact, footer
- `autres-prestations.html`: Services/amenities page (491 lines) - secondary informational page

**Configuration:**
- `PRD_english.txt`: Complete product requirements and technical constraints
- `PRD.txt`: French version of PRD
- `.planning/codebase/ARCHITECTURE.md`: Architecture documentation
- `.planning/codebase/STRUCTURE.md`: This file

**Core Logic:**
- `index.html` (lines 2137-2325): Gallery module with carousel, modal, auto-slide
- `index.html` (lines 3227-3442): Main JavaScript initialization and event handlers
  - Mobile menu toggle (line 3230-3247)
  - Header scroll effect (line 3249-3258)
  - Menu tabs system (line 3261-3277)
  - FAQ accordion (line 3279-3310)
  - Smooth scroll anchor navigation (line 3313-3343)
  - Intersection Observer animation (line 3346-3364)
  - Parallax hero effect (line 3367-3381)
  - Reservation form handler (line 3384-3441)

**Styling:**
- `index.html` (lines 11-1766): Inline CSS covering all styles
  - CSS variables (lines 12-31) define color palette and spacing
  - Component styles: header, hero, gallery, menu, forms, buttons, footer
  - Media queries for responsive behavior (max-width: 992px, 768px, etc.)

- `autres-prestations.html` (lines 7-127+): Inline CSS for secondary page

**External Integrations:**
- Optyms booking widget (line 2681): `https://api.optyms.com/widget/booking/uEgzRczdrZRnr2xmIG1V`
- ReputationHub reviews (line 2711): `https://reputationhub.site/reputation/assets/review-widget.js`

## Naming Conventions

**Files:**
- HTML pages: lowercase, hyphen-separated (`autres-prestations.html`)
- Media files: lowercase, hyphen-separated or underscore-separated
  - Descriptive: `salade-de-crevettes-a-la-mangue.jpeg`
  - Photo series: `ambiance-restaurant-la-canne-a-sucre-Ales.jpg` (with size variant: `-600X400.jpg`)
  - Team photos: `chef-jean-Arnaud-restaurant-la-canne-a-sucre-ales.png`

**CSS Classes:**
- BEM-inspired with hyphens: `.gallery-item`, `.gallery-modal-content`, `.menu-item-price`
- State classes: `.active`, `.scrolled` (header state), `.aos-animate` (animation applied)
- Utility prefixes: `.section`, `.container`, `.btn`, `.btn-secondary`
- Decorative elements: `.decoration-spice`, `.gallery-item-play`

**JavaScript Variables:**
- camelCase: `galleryItems`, `currentIndex`, `modalMediaContainer`, `menuTabs`
- DOM selectors: `document.querySelector('.selector')`, `document.getElementById('id')`
- Event handlers: `function` declarations (not arrow functions)
- State variables: `const` for immutable references, `let` for mutable values

**HTML IDs and Data Attributes:**
- Lowercase with hyphens: `#menu-toggle`, `#nav-menu`, `#date`, `#persons`
- Data attributes: `data-tab` (menu system), `data-aos` (animation trigger), `data-index` (gallery item)

**Section IDs:**
- Smooth-scrolling anchors: `#about`, `#gallery`, `#menu`, `#featured`, `#reservation`, `#testimonials`, `#team`, `#faq`, `#contact`

## Where to Add New Code

**New Feature:**
- Primary code: Add `<section>` to `index.html` (place after corresponding section based on scroll order)
- Styling: Add CSS rules within `<style>` block (maintain color scheme via CSS variables)
- Interactivity: Add `<script>` logic within main `DOMContentLoaded` handler (lines 3229-3442)
- Testing: No test files present (see CONCERNS.md)

**New Page/Component:**
- Create new `.html` file in root directory (e.g., `special-events.html`)
- Reference shared assets: `./Medias/images/`, `./Medias/videos/`
- Reference external libraries same as `autres-prestations.html` (Font Awesome, Google Fonts if needed)
- Maintain consistent color palette and typography (defined in CSS variables)

**Media Assets:**
- Images: Place in `Medias/images/` with descriptive hyphenated names
- Videos: Place in `Medias/videos/` with descriptive names
- Reference in gallery: Update `galleryItems` array (line 2141-2147 in index.html) with new paths

**New Gallery Media:**
- Add object to `galleryItems` array (line 2141-2147):
  ```javascript
  { type: 'image', src: './Medias/images/new-dish.jpg', caption: 'Dish Name', description: 'Description' },
  { type: 'video', src: './Medias/videos/new-video.mp4', caption: 'Video Title', description: 'Video Description' }
  ```

**Utilities/Helpers:**
- No separate utilities folder exists
- Shared logic: Embed directly in main `<script>` block or extract as named functions within DOMContentLoaded closure

## Special Directories

**Medias/:**
- Purpose: Static media storage for gallery, menu, team sections
- Generated: No—manually curated and uploaded
- Committed: Yes—all media files are git-tracked

**.planning/codebase/:**
- Purpose: GSD workflow documentation (architecture, patterns, tech stack)
- Generated: Yes—created by GSD mapping tools
- Committed: Yes—part of project documentation

**.git/:**
- Purpose: Version control repository
- Generated: Yes—initialized with `git init`
- Committed: N/A (git metadata)

## Structure for Future Expansion

**If converting to SaaS (Base44 integration):**
- Separate concerns: Move pure HTML/CSS presentation to separate views
- Create `src/` directory for modular JavaScript components
- Implement routing layer to handle multiple pages
- Extract gallery, menu, FAQ systems into reusable component modules

**If adding backend:**
- Create `api/` or `server/` directory for business logic
- Implement API endpoints for menu management, reservation retrieval
- Maintain Airtable as primary data source (per PRD requirements)
- Create `middleware/` for auth, validation, error handling

**If adding tests:**
- Create `tests/` directory for unit, integration, e2e test files
- Use naming pattern: `feature.test.js` or `feature.spec.js`
- Place tests adjacent to features being tested or in centralized `tests/` folder

---

*Structure analysis: 2026-02-26*
