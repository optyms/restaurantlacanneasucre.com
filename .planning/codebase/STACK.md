# Technology Stack

**Analysis Date:** 2026-02-26

## Languages

**Primary:**
- HTML5 - Frontend markup for website pages
- CSS3 - Styling and animations (inline styles in HTML files)
- JavaScript (Vanilla) - Client-side interactivity and DOM manipulation

**Secondary:**
- French (UI/UX language for all user-facing content)

## Runtime

**Environment:**
- Web Browser (no specific Node.js runtime for static site)
- Modern browsers with ES6 support required

**Deployment:**
- Static site hosting (HTML, CSS, JavaScript files)
- No server-side runtime detected

## Frameworks

**Frontend:**
- None - Vanilla HTML/CSS/JavaScript
- Custom DOM manipulation (no framework)

**UI Libraries:**
- Font Awesome 6.0.0 - Icon library
- Google Fonts (Poppins, Cormorant Garamond) - Typography

**Animations/Effects:**
- Custom CSS animations and transitions (CSS3)
- Intersection Observer API for scroll-triggered animations (AOS pattern)
- CSS Custom Properties (Variables) for theming

## Key Dependencies

**Critical:**
- Optyms Booking Widget (api.optyms.com) - Reservation system integration
  - Widget embed: `https://api.optyms.com/widget/booking/uEgzRczdrZRnr2xmIG1V`
  - Form embed script: `https://api.optyms.com/js/form_embed.js`
  - Purpose: Handles reservation bookings from the website

**External Services:**
- Google Fonts - Web font loading via `https://fonts.googleapis.com`
- Font Awesome CDN - Icon set via `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/`
- Google Maps API - Location embed for restaurant address
  - Embedded iframe for location display
- Reputation Hub - Review widget
  - Widget script: `https://reputationhub.site/reputation/assets/review-widget.js`

## Configuration

**Environment:**
- Static site - no environment variables detected
- No .env files present
- All configuration hardcoded in HTML (CDN URLs, widget IDs, coordinates)

**Styling Configuration:**
- CSS Custom Properties (variables) defined at `:root` level in `index.html`
- Color palette:
  - Primary (Terracotta): `#C2703D`
  - Primary Light: `#E7904B`
  - Primary Dark: `#A85C2F`
  - Secondary (Emerald Green): `#2E6E65`
  - Secondary Light: `#3D8F84`
  - Accent (Warm Gold): `#FFCB69`
  - Light Background: `#FFF8F0`
  - Dark Text: `#292522`
  - Gray: `#7A746E`
- Font families:
  - Heading: Cormorant Garamond (serif)
  - Body: Poppins (sans-serif)
- Transition definitions:
  - Fast: 0.2s ease
  - Medium: 0.3s ease
  - Slow: 0.5s ease

**Build:**
- No build process detected
- No configuration files (package.json, webpack, etc.)
- Direct HTML/CSS/JS deployment

## Platform Requirements

**Development:**
- Text editor or IDE for HTML/CSS/JS editing
- Git for version control
- Web browser for local testing

**Production:**
- Web server or static hosting platform
- HTTPS support (recommended for external API calls)
- Browser compatibility:
  - Modern browsers (Chrome, Firefox, Safari, Edge)
  - ES6 support required
  - CSS Grid and Flexbox support required
  - Intersection Observer API support required

## File Structure

**Main Entry Points:**
- `index.html` (main website)
- `autres-prestations.html` (services/offerings page)

**Assets:**
- `Medias/images/` - Product and team photos
- `Medias/videos/` - Video content

**Styling:**
- Inline CSS in HTML files (no external stylesheet detected)

## External Integrations Summary

**Booking System:**
- Optyms (primary reservation platform)

**Reviews & Reputation:**
- Reputation Hub (review widget)

**Maps:**
- Google Maps (location display)

**Content Delivery:**
- Google Fonts (typography)
- Font Awesome CDN (icons)

---

*Stack analysis: 2026-02-26*
