## Why

The `freebie-gwp-pricing` Cart Transform currently zeroes an entire freebie line's price whenever *any* paired main line exists, with no regard for quantity (explicit prior decision — see the archived `add-gwp-freebie-cart-transform` change, design decision #4). That was a deliberate MVP cut, but it leaves a real tamper/abuse gap now that customers can freely change line quantities in cart: a customer can raise a freebie line's quantity to any number while only ever adding 1 unit of the main product, and get every extra unit for free — enforced server-side, so it can't be fixed client-side alone.

The store needs the freebie quantity reconciled 1:1 against the paired main product's quantity: only as many freebie units are free as there are main-product units in the cart, live, on every cart change.

## What Changes

- The function now sums quantity across all `main`-role lines sharing a `_freebiegwp` value into a shared pool, and allocates free units from that pool across all `freebie`-role lines sharing that value, in cart line order, 1 free unit per 1 pooled main unit.
- A freebie line whose quantity is fully covered by the pool is zeroed in full (unchanged mechanism: `lineUpdate`).
- A freebie line with no pool remaining is left untouched at full price (unchanged mechanism: no operation — same as today's orphan case).
- A freebie line that straddles the boundary (partially covered by the pool) is split into a free portion and a full-price portion via `lineExpand`, since `lineUpdate` cannot apply two different per-unit prices to one line. This is a new mechanism for this app and has a UI side effect: Shopify renders `lineExpand` output as a bundle (a parent row with nested child rows) rather than one flat line, on the one line where a split actually occurs.
- **MODIFIED**: the requirement scenario stating "freebie quantity is not reconciled against main product quantity" is reversed — quantity reconciliation is now the core behavior.
- The function's GraphQL query gains `quantity` and `merchandise { ... on ProductVariant { id } }` on cart lines (the latter needed to build `lineExpand`'s `expandedItems.merchandiseId`).

Explicitly out of scope for this change:
- Any ratio other than strict 1:1 (confirmed with the store owner — not needed now; not designed as a configurable value).
- Client-side cart-page UX polish (e.g. disabling/clamping the freebie quantity stepper in the UI). The server-side cap is the source of truth regardless of what the UI does or doesn't prevent.
- Cleanup/removal of the now-full-price "excess" portion of a split freebie line. It's left in cart at full price, same fail-safe philosophy as the existing orphan case.

## Capabilities

### Modified Capabilities
- `freebie-gwp-pricing`: freebie pricing is now reconciled against paired main product quantity (1:1), instead of being all-or-nothing per line.

## Impact

- `extensions/freebie-gwp-pricing/src/cart_transform_run.graphql`: add `quantity`, `merchandise { ... on ProductVariant { id } }`.
- `extensions/freebie-gwp-pricing/src/cart_transform_run.ts`: replace the pairing check with pool-based allocation across grouped lines; emit `lineUpdate`, `lineExpand`, or no operation per freebie line depending on how much of its quantity the pool covers.
- `extensions/freebie-gwp-pricing/tests/`: existing fixtures for the old "not reconciled" behavior are superseded; new fixtures needed for partial-split, multi-main pooling, and multi-freebie allocation order.
- No changes to the `_freebiegwp` / `_freebiegwp_role` attribute contract — the future client-side integration is unaffected.
- No changes to other repos (`checkout-app`, `popon-shopify-store`).
