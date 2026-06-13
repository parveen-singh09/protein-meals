m# TODO - HighProtein Valley

## Image exact matching (remote search disabled)
- [ ] Add deterministic image mapping by food.id using an external-image lookup step (web search) is NOT implemented; instead we’ll add a local-image resolver.
- [ ] Add script: `scripts/check-food-images.mjs` to verify `public/foods/<food-id>.*` exists for each entry in `src/data/foods.js`.
- [ ] Update `src/data/foods.js`: set `image` to `/foods/<id>.jpg` (or `.webp`) where local images exist; keep remote URL fallback for missing ones.
- [ ] Update `src/components/FoodCard.astro` to prefer local image path and add graceful fallback UI if image fails to load.
- [ ] Run `npm run build` and verify images resolve.

