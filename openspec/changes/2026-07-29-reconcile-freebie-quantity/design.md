## Context

This builds directly on `freebie-gwp-pricing` (see [[../../specs/freebie-gwp-pricing/spec.md]] and the archived `add-gwp-freebie-cart-transform` change's design.md). That change explicitly deferred quantity reconciliation (decision #4: *"no quantity reconciliation between freebie count and main-product count... entirely the future client-side code's responsibility"*). This change reopens that decision because customers can manipulate cart line quantity directly (including via the Cart AJAX API, bypassing any theme UI), and the whole point of doing this in a Cart Transform rather than client-side is that it can't be tampered with — quantity has to be capped here too, or the original tamper-resistance goal is only half met.

Explored and confirmed with the store owner during discovery:
- The free:main ratio is strictly 1:1 and not expected to need configuration later — no need to design in a ratio field.
- Splitting a line's quantity into free + paid portions requires `lineExpand`, and its bundle-style rendering (parent row + nested child rows in cart/checkout) is an accepted trade-off, not a blocker.

## Goals / Non-Goals

**Goals:**
- Free freebie units are capped at the paired main product's quantity, live, recomputed on every cart change (Cart Transform functions rerun on every mutation — no explicit "sync" needed).
- Multiple main lines sharing a campaign pool their quantity together.
- Multiple freebie lines sharing a campaign draw from that shared pool deterministically, in cart line order.
- Preserve all existing behavior this doesn't touch: orphan freebies at full price, malformed/missing attributes ignored, campaign isolation via exact `_freebiegwp` match, no interaction with the store's other discounts.

**Non-Goals:**
- Configurable ratios (e.g. 2 main → 1 free). Confirmed out of scope for this change.
- Client-side quantity-stepper UX (disabling/clamping the freebie qty input in the cart page UI). Out of scope — the server-side cap is authoritative regardless.
- Any cleanup of the full-price "excess" portion of a split line — left in cart, same fail-safe philosophy as today's orphan case.

## Decisions

**1. Pool-and-allocate, grouped by `_freebiegwp` value.** For each distinct timestamp value present on any `main`-role line:
```
pool = sum(quantity) over all main-role lines with this _freebiegwp value

for each freebie-role line with this _freebiegwp value, in cart.lines array order:
    free = min(pool, line.quantity)
    pool -= free
    paid = line.quantity - free

    if free == line.quantity:        → lineUpdate, fixedPricePerUnit "0" (today's mechanism, unchanged)
    elif free == 0:                  → no operation (today's orphan mechanism, unchanged)
    else (0 < free < line.quantity): → lineExpand into two components (new)
```
Freebie lines with no matching main line at all behave exactly as today (pool = 0 for their group → no operation).

**2. `lineExpand` only where a line genuinely straddles the free/paid boundary.** This confines the bundle-rendering side effect to the minimum surface: a freebie line that's fully covered still gets a plain `lineUpdate` (looks identical to today), and a fully-uncovered line gets no operation at all. Only a line that's part-free, part-paid ever renders as a bundle.

**3. Cart line array order is the allocation order, not insertion timestamp or line ID.** Shopify Functions must be pure — same input, same output — so the order needs to be something already deterministic and available. `cart.lines` array order (already relied on implicitly by the existing pairing logic) is the natural choice; no new ordering concept introduced.

**4. `lineExpand`'s paid-portion `ExpandedItem` omits `price` entirely**, letting it default to the item's normal price, rather than this function trying to read and re-apply `cost.amountPerQuantity` itself. Simpler, and avoids the function asserting a price it didn't originally compute. **Unverified**: need to confirm during implementation that an `ExpandedItem` with no `price` genuinely reproduces the original line's actual price (not a different catalog/base price) for lines with e.g. subscription selling plans — see Risks.

**5. Original `_freebiegwp` / `_freebiegwp_role` attributes are carried onto both `ExpandedItem`s.** `ExpandedItem.attributes` supports this directly. Keeps both resulting lines self-describing and consistent with how the rest of the function reasons about pairing, in case any downstream tooling (analytics, order tagging) inspects line attributes later.

**6. `merchandise { ... on ProductVariant { id } }` added to the query**, needed as `expandedItems[].merchandiseId`. Only the `ProductVariant` arm of the `Merchandise` union is handled; a freebie/main line on a `CustomProduct` merchandise type is not expected in this store's flow and is out of scope (falls through to no operation, same fail-safe default as any other unhandled case).

## Risks / Trade-offs

- **`lineExpand` bundle rendering is unverified in this store's actual cart/checkout theme.** Accepted in principle during discovery, but the visual result (parent + nested child rows) should be checked in a dev store before considering this done — it may need `title`/`image` overrides on the `ExpandedItem`s to look acceptable, which isn't scoped here.
- **Re-run idempotency across Cart Transform invocations is assumed, not confirmed.** This function is assumed to receive the original, unexpanded cart line on every run (not the output of its own previous run layered on top) — standard behavior for Shopify Functions, but not verified against the live API for the store's API version. If wrong, a previously-split line could be fed back in as already-expanded input in a way this logic doesn't anticipate. Flagged for manual verification (see tasks.md) — same category of gap the original change left open and never closed (manual verification was deferred at archive time).
- **Allocation order (cart line array order) is a first-come-first-served rule with no merchant-facing rationale surfaced anywhere** — if a customer has two freebie lines and only one gets the free unit, there's no UI explanation of *why* that one. Acceptable for this MVP; worth revisiting if it causes support questions.
- **No client-side UX changes here** means a customer can still freely raise a freebie line's quantity past what's coverable — it'll just render as a mixed free/paid bundle rather than silently being free. That's correct and safe, but not necessarily a polished experience; flagged as a possible follow-up, not blocking.
