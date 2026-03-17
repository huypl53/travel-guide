# Production-Grade Landing Page for Homestay Locator

## Summary

Replace the basic `anon-landing.tsx` with a polished, conversion-optimized landing page. Single-phase implementation — one file rewrite + minor CSS additions.

## Design System (from ui-ux-pro-max)

- **Pattern:** Hero + Testimonials + CTA (social-proof-focused)
- **Colors:** Existing oklch theme — blue primary `oklch(0.59 0.17 240)`, warm orange accent `oklch(0.70 0.17 50)`
- **Typography:** Geist Sans (already configured in layout)
- **Icons:** lucide-react (already installed)
- **Animations:** CSS-only via Tailwind + tw-animate-css. Respect `prefers-reduced-motion`
- **Style:** Clean, trust-building with social proof elements

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Implement Landing Page](./phase-01-implement-landing-page.md) | pending |

## Key Decisions

- **No new dependencies** — use existing shadcn/ui, Tailwind v4, lucide-react, tw-animate-css
- **CSS-only animations** — no JS animation libraries; use Tailwind keyframes + `@keyframes` in globals.css
- **Single file rewrite** — replace `anon-landing.tsx` contents, add keyframes to `globals.css`
- **Keep existing functionality** — `nanoid` slug generation, `useRouter` navigation
- **Header stays in layout** — landing page doesn't render its own header

## Architecture

```
src/
├── app/
│   ├── globals.css          (MODIFY — add keyframes for gradient, fade-in, float)
│   └── page.tsx             (NO CHANGE — already renders <AnonLanding /> for anon users)
└── components/
    └── anon-landing.tsx     (MODIFY — full rewrite with 6 sections)
```
