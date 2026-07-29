## 1. Scaffold the app

- [x] 1.1 Initialize a new Shopify app in this repo (`shopify app init` or equivalent CLI scaffold). App created at `popon-freebie-discount/` (React Router template).
- [x] 1.2 Add the `write_cart_transforms` access scope to `shopify.app.toml`. Also removed the template's unrelated demo scopes (`write_products`, `write_metaobjects`, `write_metaobject_definitions`) and demo metafield/metaobject config, since they're unused by this app.
- [x] 1.3 Generate a Cart Transform Function extension, JavaScript template. Created at `extensions/freebie-gwp-pricing/` (TypeScript flavor).
- [x] 1.4 Confirm, against the current Shopify Functions API reference for the API version in use, that Cart Transform `update` operations support a `price.percentageDecrease` field and that Cart Transforms run before Discount functions in the calculation pipeline (design assumption to verify, not re-derive). **Correction found:** the real schema (API version 2026-04) only supports `price.adjustment.fixedPricePerUnit.amount` on line `update` operations, not a percentage. Also confirmed directly in the schema docstring: `update` operations require a Shopify Plus plan (store confirmed to be on Plus). design.md updated with both findings.

## 2. Implement the function logic

- [x] 2.1 Define the function's GraphQL input query: cart lines with `id`, and `attribute(key: "_freebiegwp")` / `attribute(key: "_freebiegwp_role")` (aliased as `freebieGwp` / `freebieGwpRole`). `quantity` omitted — unused by the verifier logic.
- [x] 2.2 Implement pairing logic: for each line with `_freebiegwp_role == "freebie"`, check for any other line with matching `_freebiegwp` and `_freebiegwp_role == "main"`.
- [x] 2.3 Emit a `lineUpdate` operation with `price.adjustment.fixedPricePerUnit.amount = "0"` for each freebie line with a valid pairing; emit nothing for unpaired (orphan) freebie lines. (Field corrected per 1.4 finding.)
- [x] 2.4 Unit tests covering: normal pair, orphan freebie (no main), multiple freebie lines sharing one timestamp, multiple main lines sharing one timestamp, two independent campaigns with distinct timestamps in the same cart, missing/malformed attributes. 7 fixture-based tests, all passing (`npm test` in the extension directory). Function also builds cleanly to WASM (`npm run build`).

## 3. Registration

- [x] 3.1 Implement the app install handler to call `cartTransformCreate`, registering the function. Added `app/cart-transform.server.js`, wired into `hooks.afterAuth` in `app/shopify.server.js`. Looks up the deployed function by title + `apiType: "cart_transform"`, then calls `cartTransformCreate` with `blockOnFailure: false` (see design.md decision 8). **Not yet verified against a live Admin API** — the Admin GraphQL field/query names (`cartTransforms`, `shopifyFunctions`, `cartTransformCreate`) are from documentation knowledge, not confirmed against a live schema this session. Needs a real `shopify app deploy` + install pass to confirm (see task 4).
- [x] 3.2 Handle re-install / re-auth without creating duplicate Cart Transform registrations. `registerFreebieCartTransform` checks for an existing `cartTransforms` entry before creating one; no-ops if one already exists.

## 4. Manual verification in a dev store

- [ ] 4.1 Add a main product and a freebie product to cart with matching `_freebiegwp` / `_freebiegwp_role` attributes (via GraphiQL cart mutation or equivalent), confirm the freebie's price is zeroed at checkout.
- [ ] 4.2 Add only a freebie-tagged line with no paired main line, confirm it stays at full price.
- [ ] 4.3 Confirm the store's existing automatic discount on the main product still applies normally and is unaffected by the freebie's price change.
- [ ] 4.4 Confirm two independent GWP pairs (distinct timestamps) in the same cart are each handled correctly and don't cross-pair.
