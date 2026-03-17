# Phase 01 — Implement Production Landing Page

## Context

- Current: `src/components/anon-landing.tsx` — basic hero + 4 feature cards (~82 lines)
- Target: Full production landing page with 6 sections, animations, social proof
- Design system: ui-ux-pro-max recommendations applied (social-proof-focused pattern)

## Requirements

### Functional
- "Start New Trip" CTA generates `nanoid(10)` slug → navigates to `/trip/{slug}`
- Responsive: mobile-first, tested at 375px / 768px / 1024px / 1440px
- All sections render without JS errors
- Links to future auth handled via existing `AuthDialog` in Header

### Non-Functional
- No new npm dependencies
- CSS animations only (no JS animation libs)
- `prefers-reduced-motion` respected
- Lighthouse performance score maintained (no heavy images/fonts)
- WCAG AA color contrast (4.5:1 minimum)
- All interactive elements have `cursor-pointer`
- Focus states visible for keyboard nav

## Related Code Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/anon-landing.tsx` | MODIFY | Full rewrite — 6-section landing page |
| `src/app/globals.css` | MODIFY | Add 3 CSS keyframe animations |

## Design Specification

### Section 1: Hero
- Full-viewport height section with animated gradient background
- Gradient: primary → transparent, slowly shifting via CSS `@keyframes gradient-shift`
- Large headline: "Find Your Perfect Homestay" (bold, text-4xl→text-6xl responsive)
- Subtext: value prop in 1-2 sentences, max-w-2xl, muted-foreground
- Primary CTA: "Start New Trip" button (lg size, accent color bg for contrast)
- Secondary text below CTA: "Free to use. No account required."
- Decorative floating elements: subtle MapPin icons with CSS float animation

### Section 2: Feature Showcase
- Section heading: "Everything you need to pick the perfect base"
- 4 feature cards in 2x2 grid (sm:grid-cols-2), stacked on mobile
- Each card: icon in colored circle + title + description
- Cards have subtle hover shadow transition
- Features (existing data):
  1. MapPin → "Pin Locations" — Add via Google Maps links, address search, or CSV
  2. BarChart3 → "Smart Ranking" — Auto-ranking by weighted average distance
  3. Navigation → "Driving Time" — On-demand driving distance via OSRM
  4. Share2 → "Share & Export" — Cloud save + read-only sharing links

### Section 3: How It Works
- Section heading: "How it works"
- 3-step horizontal flow (vertical on mobile)
- Each step: number badge (1/2/3) + icon + title + short description
- Visual connector line/dots between steps (hidden on mobile)
- Steps:
  1. MapPin → "Add your locations" — Pin homestays and destinations on the map
  2. BarChart3 → "Get smart rankings" — Algorithm ranks homestays by proximity
  3. CheckCircle → "Pick your stay" — Choose the best option with confidence

### Section 4: Social Proof / Stats
- Light muted background to break visual rhythm
- 3-4 stat counters in a row (responsive grid)
- Stats (placeholder data, easily changeable):
  - "1,000+" trips planned
  - "5,000+" locations compared
  - "100%" free, no ads
  - "< 2s" ranking calculation
- Each stat: large bold number + small description below

### Section 5: Final CTA
- Clean section with centered text
- Headline: "Ready to find your perfect homestay?"
- Subtext: brief encouragement
- Same "Start New Trip" CTA button as hero
- Optional: "No sign-up required" trust text

### Section 6: Footer
- Minimal footer with branding
- MapPin icon + "Homestay Locator" text
- "Built for travelers, by travelers" tagline
- Copyright line with current year
- Muted colors, border-top separator

## CSS Animations (globals.css additions)

```css
/* Animated gradient background for hero */
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Fade-in-up for sections on load */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Floating decorative elements */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
```

All animations wrapped in `@media (prefers-reduced-motion: no-preference)` check.

## Implementation Steps

### Step 1: Add CSS keyframes to globals.css
- Append 3 keyframe definitions after existing `@layer base` block
- Wrap in `@media (prefers-reduced-motion: no-preference)` where applied

### Step 2: Rewrite anon-landing.tsx
- Keep `"use client"` directive
- Keep existing imports: `useRouter`, `Button`, `nanoid`, lucide icons
- Add new lucide imports: `CheckCircle`, `Compass`, `Clock`, `Users`
- Structure component with 6 sections as specified above
- Use existing shadcn `Button` component for CTAs
- Use Tailwind utility classes for all styling
- Ensure all interactive elements have `cursor-pointer`
- Use `animate-` classes for CSS animations

### Step 3: Verify
- `npm run build` passes without errors
- Visual check at 375px, 768px, 1024px, 1440px
- CTA button navigates correctly
- No horizontal scroll on mobile
- Animations respect reduced-motion

## Todo List

- [ ] Add CSS keyframes to `globals.css`
- [ ] Rewrite `anon-landing.tsx` — Hero section
- [ ] Rewrite `anon-landing.tsx` — Feature showcase section
- [ ] Rewrite `anon-landing.tsx` — How it works section
- [ ] Rewrite `anon-landing.tsx` — Stats/social proof section
- [ ] Rewrite `anon-landing.tsx` — Final CTA section
- [ ] Rewrite `anon-landing.tsx` — Footer section
- [ ] Verify build passes
- [ ] Verify responsive layout

## Success Criteria

- [ ] All 6 sections render correctly
- [ ] "Start New Trip" CTA works (generates slug, navigates)
- [ ] Responsive at all 4 breakpoints
- [ ] CSS animations play smoothly, respect reduced-motion
- [ ] No new dependencies added
- [ ] `npm run build` succeeds
- [ ] Keyboard navigation works (focus states visible)
- [ ] Color contrast meets WCAG AA

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Animation performance on low-end devices | Low | CSS-only transforms (GPU-accelerated), reduced-motion fallback |
| Tailwind v4 class differences | Medium | Use only established utility classes, test build |
| Content too long on mobile | Low | Test at 375px, adjust spacing |

## Next Steps

After implementation:
- Run `npm run build` to verify
- Visual review at all breakpoints
- Consider adding intersection observer for scroll-triggered animations (future enhancement, not in scope)
