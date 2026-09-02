# MAAR Money

A calm, simple personal finance web app: track income, savings, spending, and separate savings "Bundles" — with a satisfying celebration when you hit a goal.

## Getting started

```bash
npm install
npm run dev
```

## Going live (SEO checklist)

This repo already includes the essentials:

- `public/robots.txt` — allows all crawlers, points to the sitemap
- `public/sitemap.xml` — update the `<loc>` if you deploy to a different domain
- `public/manifest.webmanifest` — app name/icon for "Add to Home Screen"
- `public/og-image.png` — 1200×630 social preview image
- `index.html` — meta description, canonical URL, Open Graph, Twitter card, and JSON-LD structured data (`WebApplication` schema)
- Google Analytics (GA4) snippet in `index.html`, **currently a placeholder** — swap every `G-XXXXXXXXXX` for your real Measurement ID from analytics.google.com

Before/after deploying, also:
1. Update every `https://maarmoney.vercel.app` reference (in `index.html`, `sitemap.xml`, `robots.txt`) if your final domain differs.
2. Submit the sitemap URL in Google Search Console once the site is live.
3. This is a client-rendered single-page app, which search engines can index but less reliably than a server-rendered page. If ranking well matters a lot, consider pre-rendering the home route (e.g. `vite-plugin-ssr`, `vite-plugin-prerender`, or a static marketing page in front of the app) — the meta tags here get you most of the way without that extra step.

## Animation

Uses [`motion`](https://motion.dev) (the Framer Motion successor) for a single page-transition on navigation, a staggered reveal on the Bundles grid, and a `BlurText` heading reveal (used once per screen, not on every element). Numbers on summary cards count up into place. All animation respects `prefers-reduced-motion`.

## Notes

- Data persists locally in the browser via `localStorage` — nothing is sent to a server.
- Built with React, Vite, Recharts, lucide-react, and motion.
- Aims to meet WCAG 2.1 AA accessibility standards.

MAAR Money is not a bank, financial adviser, or regulated financial service — it's a tool for organisation, tracking, and motivation.
