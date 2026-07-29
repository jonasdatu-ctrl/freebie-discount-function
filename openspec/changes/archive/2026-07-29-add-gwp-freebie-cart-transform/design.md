## Context

The store's GWP mechanism (mechanism TBD client-side — likely driven by a rule inside the store's existing cart/upsell tooling, or bespoke JS — is not part of this change) adds a free product line to cart alongside a qualifying main product. To make the checkout function's logic decidable, both lines will carry matching custom attributes:

```
Main product line:
  _freebiegwp      : "<timestamp>"
  _freebiegwp_role : "main"

Freebie product line:
  _freebiegwp      : "<timestamp>"   ← same value as its paired main line
  _freebiegwp_role : "freebie"
```

This attribute contract is produced entirely by future, separate client-side work. This change consumes it but does not produce it.

Shopify's cart calculation pipeline runs, in order: Cart Transform functions, then Discount functions, then delivery/payment customizations. Because Cart Transforms run first, a price change made here is already baked into the line by the time any Discount function (including the store's existing automatic discount on the main product) evaluates. This sidesteps discount "combines with" stacking entirely for this feature — it was seriously considered and explicitly ruled out during exploration in favor of this simpler, structurally-conflict-free approach.

## Goals / Non-Goals

**Goals:**
- Zero the price of a GWP freebie line at checkout, server-side, in a way the customer cannot tamper with.
- Correctly leave a freebie line at full price when its pairing is broken or absent (orphaned freebie — e.g. main product removed from cart after the freebie was added).
- Never interact with or require configuration changes to the store's existing automatic discount on the main product.
- Support multiple independent, concurrent GWP campaigns in the same cart (different product pairs, different timestamps) without cross-talk.

**Non-Goals:**
- Deciding GWP eligibility — i.e., whether a given cart *should* have a freebie added, and to which product it should be paired. That decision is made entirely by the (separate, future) client-side code that adds the freebie line in the first place. This function only re-verifies the pairing still holds at checkout time.
- Removing or cleaning up orphaned freebie lines. Left at full price by design; any cleanup is the responsibility of the future client-side implementation.
- Any merchant-facing configuration: percentage amount, discount title/label, or an on/off toggle. Hardcoded to 100% off, auto-activated on install.
- Relabeling the freebie line's title or image. Price only.

## Decisions

**1. Cart Transform Function, not Discount Function.** A Discount Function (automatic discount) was the initial approach explored, but it requires explicit "combines with" configuration to safely coexist with the store's existing automatic discount on the main product, and both would need to be reasoned about together at the same pipeline stage. A Cart Transform runs *before* discounts, so it removes the interaction entirely rather than managing it.

**2. `price.adjustment.fixedPricePerUnit.amount = "0"`.** Confirmed against the real generated schema (API version 2026-04): Cart Transform `update` operations only support `fixedPricePerUnit` — there is no percentage-based adjustment for this operation (that only exists on Discount functions, which this change deliberately avoids). A fixed amount of `"0"` is currency-agnostic in practice since zero is zero regardless of currency, so the original goal (no currency-specific logic needed) still holds.

**3. Pairing key is an exact string match on `_freebiegwp`; role is disambiguated via a separate `_freebiegwp_role` attribute (`"main"` | `"freebie"`).** The timestamp alone can pair two lines together but can't say which one is the free one — both carry the identical value by design. The role attribute resolves that ambiguity explicitly rather than inferring it (e.g. from price or product ID), which was considered and rejected as fragile.

**4. The function is a verifier, not a decider.** It does not judge whether a freebie *should* exist — only whether its claimed pairing is still valid right now. Concretely: for every `freebie`-role line, discount it if *any* `main`-role line shares its exact timestamp; no quantity reconciliation between freebie count and main-product count. Eligibility math (how many freebies for how many main-product units) is entirely the future client-side code's responsibility.

**5. Auto-registration on install, no admin UI.** The Cart Transform is created via `cartTransformCreate` triggered from the app's install flow. There is no merchant-facing toggle in this version; disabling it means uninstalling the app (or manual removal via the Admin API). This is a deliberate MVP scope cut, not an oversight — an admin toggle can be added later as a purely additive change.

**6. JavaScript, not Rust, for the function.** JS is the faster-to-iterate option and is what most current Shopify Functions documentation assumes; the performance ceiling of Rust isn't a meaningful benefit for logic this simple.

**7. Cart Transform `update` operations require a Shopify Plus plan** (confirmed directly in the generated schema's docstring for this API version). Confirmed with the store owner that the target store is on Plus, so this is not a blocker — but it's a hard platform gate, not a config toggle, and would fully invalidate this architecture on a non-Plus store.

**8. `cartTransformCreate` is called with `blockOnFailure: false`.** If the function ever errors at runtime, checkout proceeds without the price adjustment rather than blocking checkout store-wide. Consistent with the existing fail-safe philosophy (orphaned/unpaired freebies stay at full price rather than erroring) — a bug in this app should never be able to stop customers from checking out.

## Risks / Trade-offs

- **Hard dependency on a not-yet-built client-side contract.** If the future client-side implementation ever sets `_freebiegwp_role` to an unexpected value, omits it, or sends a timestamp in a different type/format than expected, pairing silently fails closed (freebie stays full price) rather than surfacing an error anywhere. This is the intended fail-safe behavior, but it means a client-side bug could look like "the promo just isn't working" with no direct signal pointing at the cause. Worth flagging clearly to whoever builds that piece next.
- **Timestamp collisions are structurally possible** (e.g., two unrelated GWP events landing on the same low-resolution `Date.now()` value) and are entirely outside this function's control — it will pair whatever matches exactly. Recommend the future client-side implementation use a higher-entropy pairing token (e.g. include a random component), not just a raw timestamp.
- **No merchant kill-switch beyond uninstalling the app.** Acceptable for this version's scope, but worth revisiting if the promo needs to be paused independently of the app's install state.
- **Cart Transform pipeline ordering and the exact price-adjustment field names should be confirmed against the current Shopify Functions API reference at implementation time.** This design relies on documented Shopify behavior (Cart Transform runs before Discounts; `update` operations support a `price` field with `percentageDecrease`) that should be verified against the live GraphQL schema for the API version actually used, since Shopify's Function APIs evolve between versions.
