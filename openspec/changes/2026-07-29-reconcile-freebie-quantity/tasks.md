## 1. Extend the function's GraphQL input

- [ ] 1.1 Add `quantity` to the `cart.lines` selection in `cart_transform_run.graphql`.
- [ ] 1.2 Add `merchandise { ... on ProductVariant { id } }` to the same selection (needed for `lineExpand`'s `expandedItems[].merchandiseId`).
- [ ] 1.3 Regenerate types (`npm run build` / codegen step in `extensions/freebie-gwp-pricing`) and confirm `CartTransformRunInput` picks up `quantity` and `merchandise`.

## 2. Implement pool-and-allocate logic

- [ ] 2.1 Group lines by `_freebiegwp` value; for each group, sum `quantity` across `main`-role lines into a pool.
- [ ] 2.2 Walk `freebie`-role lines within each group in `cart.lines` array order, allocating `min(pool, line.quantity)` free units per line and decrementing the pool.
- [ ] 2.3 For a freebie line fully covered (`free === line.quantity`): emit the existing `lineUpdate` (`fixedPricePerUnit: "0"`) — unchanged from current behavior.
- [ ] 2.4 For a freebie line with zero coverage (`free === 0`): emit no operation — unchanged from current orphan behavior.
- [ ] 2.5 For a freebie line partially covered (`0 < free < line.quantity`): emit a `lineExpand` with two `expandedItems` on the same `merchandiseId` — one at `quantity: free` with `price.adjustment.fixedPricePerUnit.amount: "0"`, one at `quantity: paid` with no `price` (defaults to original price). Carry the line's `_freebiegwp` / `_freebiegwp_role` attributes onto both `expandedItems` via `attributes`.
- [ ] 2.6 Confirm lines with no `_freebiegwp` group at all, or malformed/missing role attributes, are unaffected (fall through exactly as before).

## 3. Tests

- [ ] 3.1 Update `tests/fixtures/multiple-freebies-one-main.json` — this fixture's expected output currently asserts *both* freebie lines are zeroed with no quantity reconciliation; that assertion is now wrong. Add `quantity` to its lines and rewrite expected output per the new "allocated in cart order" behavior (see spec scenario), or split it into a fixture that keeps the case where quantities balance and a new one where they don't.
- [ ] 3.2 Add fixture: freebie quantity 2, main quantity 1 → partial split (`lineExpand`, 1 free + 1 paid).
- [ ] 3.3 Add fixture: main quantity 2, freebie quantity 1 → fully free (`lineUpdate`, unchanged mechanism).
- [ ] 3.4 Add fixture: main quantity 2, freebie quantity 2 → fully free (`lineUpdate`).
- [ ] 3.5 Add fixture: two main lines (qty 1 each, same timestamp) + one freebie line qty 2 → pooled to fully free.
- [ ] 3.6 Add fixture: one main line qty 1 + two freebie lines qty 1 each, same timestamp → first freebie line free, second full price (allocation order).
- [ ] 3.7 Re-run existing fixtures (`orphan-freebie-no-main`, `malformed-attributes-ignored`, `two-independent-campaigns`, `paired-freebie-and-main`, `no-operations`, `multiple-mains-one-freebie`) with `quantity` added to their lines, confirm they still pass unchanged (these are all cases where `free === line.quantity` or `free === 0`, so mechanism should be identical to today).
- [ ] 3.8 `npm test` in `extensions/freebie-gwp-pricing`, all green. `npm run build` still produces a valid WASM build.

## 4. Manual verification in a dev store

- [ ] 4.1 Confirm the `lineExpand` output actually renders in this store's cart and checkout — check whether the bundle parent/child presentation is acceptable as-is or needs `title`/`image` overrides (out of scope to fix here, but needs to be *seen* before calling this done).
- [ ] 4.2 Confirm Cart Transform re-run behavior: bump a split freebie line's quantity again (or change main quantity) after an initial `lineExpand` has applied, and confirm the function receives the original unexpanded line on the next run rather than its own previous output (see design.md Risks — this was assumed, not verified).
- [ ] 4.3 Walk through the three scenarios from the discovery conversation directly in a dev store cart: (a) bump freebie qty alone above main qty, (b) bump main qty alone with freebie qty unchanged, (c) bump both to match — confirm free/paid amounts match expectations at checkout.
- [ ] 4.4 Confirm this doesn't regress the still-unverified base scenarios carried over from the archived change (task 4 there was left incomplete): a plain paired main+freebie zeroing correctly, an orphaned freebie staying full price, the store's existing automatic discount on the main product still applying normally.
