# Architecture

**Analysis Date:** 2026-02-26

## Pattern Overview

**Overall:** Multi-layer static web application with vanilla JavaScript orchestration

**Key Characteristics:**
- Single-page HTML structure with embedded CSS and JavaScript
- Client-side DOM manipulation for interactive features
- Direct integration with third-party services (Airtable, Optyms, ReputationHub)
- No backend API layer—business logic delegated to external services
- Mobile-first responsive design with semantic sectioning

## Layers

**Presentation Layer:**
- Purpose: Render restaurant information and handle user interactions
- Location: `index.html`, `autres-prestations.html`
- Contains: HTML structure, inline CSS (scoped to page), interactive JavaScript
- Depends on: Browser APIs (DOM, EventTarget, IntersectionObserver), external libraries (Font Awesome, Google Fonts)
- Used by: Web browsers, mobile devices

**Integration Layer:**
- Purpose: Connect to external reservation and booking systems
- Location: Embedded scripts and iframe references within `index.html`
- Contains:
  - Optyms booking widget (`https://api.optyms.com/widget/booking/`)
  - ReputationHub review widget (`https://reputationhub.site/reputation/assets/review-widget.js`)
  - Gallery media data (local file references)
- Depends on: External APIs, local media files (`Medias/images/`, `Medias/videos/`)
- Used by: Presentation layer for reservation management and reviews

**Media Layer:**
- Purpose: Store and serve restaurant media assets
- Location: `Medias/images/`, `Medias/videos/`
- Contains: JPEG images, MP4 video files for gallery, team, menu items
- Depends on: File system storage
- Used by: Gallery system, team section, menu items, hero sections

## Data Flow

**Gallery Display Flow:**

1. User loads `index.html`
2. Browser executes `DOMContentLoaded` event listener (line 2138)
3. `galleryItems` array (line 2141-2147) is populated with hardcoded media references
4. `populateGallery()` (line 2160) iterates through array and creates gallery DOM elements
5. Gallery items appended to `.gallery-track` container
6. User clicks item → `openModal(index)` (line 2273) triggered
7. Modal content rendered dynamically based on item type (image/video)
8. Auto-slide timer manages 5-second carousel rotation

**Reservation System Flow:**

1. User scrolls to reservation section (line 2628)
2. Optyms iframe embedded at line 2681 renders booking form
3. User submits reservation through Optyms widget
4. Optyms processes booking and stores in Airtable (per PRD requirements)
5. Optional fallback form submission handler (line 3384-3441) for client-side feedback

**State Management:**
- Limited client-side state: `currentIndex` (gallery position), active form states, CSS class toggles
- Primary state stored in external services: Airtable (reservations), Optyms (booking), ReputationHub (reviews)
- No global state manager—all state handled through DOM manipulation and event listeners

## Key Abstractions

**Gallery System:**
- Purpose: Manage carousel display and modal interaction for media assets
- Examples: `index.html` lines 2137-2325
- Pattern: Module pattern with closure over `galleryItems` array and navigation functions
- Responsibilities:
  - `populateGallery()`: Build DOM from data array
  - `openModal()`: Display media in fullscreen overlay
  - `updateGallery()`: Update carousel position via CSS transform
  - Auto-slide timer management

**Menu System:**
- Purpose: Display restaurant menu items in tabbed interface
- Examples: Menu tabs (line 3264-3277), menu panes (line 2334-2588)
- Pattern: Event delegation on tab elements, conditional class toggling
- Responsibilities:
  - Tab click handlers toggle active states
  - Corresponding menu pane shown/hidden
  - Menu items decorated with price, description, dietary badges

**Reservation System:**
- Purpose: Entry point for customer reservation requests
- Examples: Optyms widget (line 2681), fallback form (line 3384-3441)
- Pattern: External widget iframe + optional client-side form handler
- Responsibilities:
  - Optyms widget: Primary booking interface
  - Form handler: UI feedback, validation simulation, success message display

**FAQ Accordion:**
- Purpose: Display collapsible frequently asked questions
- Examples: `index.html` line 3279-3310
- Pattern: Event delegation with animated max-height transitions
- Responsibilities:
  - Toggle active state on click
  - Animate answer expansion using CSS max-height
  - Icon switching (plus ↔ minus)

## Entry Points

**Main Website (index.html):**
- Location: `index.html`
- Triggers: User visits domain root
- Responsibilities:
  - Render complete restaurant website (hero, about, gallery, menu, reservations, testimonials, team, FAQ, contact, footer)
  - Initialize all JavaScript modules on DOMContentLoaded
  - Manage navigation, scrolling, and interactive features

**Services/Amenities Page (autres-prestations.html):**
- Location: `autres-prestations.html`
- Triggers: User navigates to `/autres-prestations.html`
- Responsibilities:
  - Display extended service offerings and special experiences
  - Render hero section with background image
  - List available prestations with descriptions

## Error Handling

**Strategy:** Graceful degradation with silent fallbacks

**Patterns:**
- Gallery: If media fails to load, browser's default broken image indicator shown
- Forms: Form submission simulated with visual feedback; actual Optyms submission handled by external service
- External scripts: If Font Awesome or external libraries fail, fallback to semantic HTML (no icons/styling degradation)
- Modal: Keyboard navigation (Escape, arrow keys) handled safely; non-existent selectors guarded with `?.` or existence checks
- Scroll behavior: Smooth scrolling wrapped in safety checks; anchor links validated before navigation

## Cross-Cutting Concerns

**Logging:**
- Browser console only (`console.log()` at line 2403 for form submission debugging)
- No server-side logging configured

**Validation:**
- No client-side form validation implemented; validation delegated to Optyms widget
- Gallery: Array bounds checked via modulo arithmetic for carousel navigation
- Anchor links: `targetElement` existence verified before scroll attempt (line 3325)

**Authentication:**
- None implemented in client—external services (Airtable, Optyms) handle authentication
- Optyms widget likely uses API key embedded in iframe src
- ReputationHub widget auto-authenticated via embedded script

**Animation:**
- CSS transitions and transforms primary mechanism (line 2239, 3303)
- Intersection Observer (line 3353) for scroll-triggered animations (`data-aos` attributes)
- `requestAnimationFrame`-style timing via auto-slide interval (line 2245)

**Responsiveness:**
- CSS media queries handle mobile/tablet/desktop breakpoints (max-width: 992px, 768px, etc.)
- Fixed header with scroll-dependent styling (line 3249-3258)
- Mobile menu toggle with icon state switching (line 3230-3247)

---

*Architecture analysis: 2026-02-26*
