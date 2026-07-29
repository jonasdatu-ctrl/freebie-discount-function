## Why

The client store runs a gift-with-purchase (GWP) promotion: a separate, future client-side integration adds a free product to cart alongside a qualifying main product, tagging both cart lines with a shared `_freebiegwp: <timestamp>` property so they can be paired back together. Nothing today can actually make the freebie free at checkout in a way that's trustworthy — cart line prices can't be safely overridden client-side (a customer could tamper with a client-only price), so this has to be enforced server-side, at checkout, by Shopify.

The store also already runs an automatic discount on the main product. A naive implementation (a Discount Function / automatic discount on the freebie) would need careful "combines with" configuration to avoid the two discounts conflicting or fighting over the same lines — and would still show as two separate discount mechanisms interacting at the same pipeline stage.

## What Changes

- New, standalone Shopify app in this repo, containing a single Cart Transform Function (JavaScript).
- The function inspects cart line custom attributes (`_freebiegwp`, `_freebiegwp_role`), and for every line tagged `_freebiegwp_role: "freebie"`, checks whether another line in the cart shares the same `_freebiegwp` timestamp and is tagged `_freebiegwp_role: "main"`.
- If a paired main line is present, the function emits an `update` operation on the freebie line setting its price via `percentageDecrease: 100` (not a fixed price, so it's correct regardless of the freebie's actual price or currency).
- If no paired main line is present (e.g. the customer removed the main product after the freebie was added), the freebie line is left untouched at full price — an intentional fail-safe default.
- Implemented as a **Cart Transform**, not a Discount Function. Cart Transforms run before Discount functions in Shopify's cart calculation pipeline, so the freebie's price is already zero by the time the store's existing automatic discount on the main product evaluates — the two never interact, and no "combines with" configuration is needed for this feature.
- The Cart Transform auto-registers itself via the Admin API (`cartTransformCreate`) on app install. No merchant-facing admin UI in this version.

Explicitly out of scope for this change:
- The client-side/theme code that adds the freebie line to cart and sets its attributes — separate work, built later.
- Cleanup or removal of orphaned freebie lines when the main product is removed from cart.
- Any merchant-facing settings/toggle UI beyond what's needed to install and auto-activate.
- Any integration with the store's existing `checkout-app` or the Rebuy app.

## Capabilities

### New Capabilities
- `freebie-gwp-pricing`: verifies gift-with-purchase pairing at checkout time and zeroes the freebie line's price server-side via a Cart Transform Function when a valid pairing is found.

### Modified Capabilities
None — this is a new, standalone app with no existing capabilities to modify.

## Impact

- New Shopify app scaffold in this repo (new `client_id` on installation).
- New Cart Transform Function extension, written in JavaScript.
- Requires the `write_cart_transforms` access scope.
- Minimal app backend: only enough to handle the install flow and call `cartTransformCreate`.
- No changes to any other repo (`checkout-app`, `popon-shopify-store`) — fully self-contained.
