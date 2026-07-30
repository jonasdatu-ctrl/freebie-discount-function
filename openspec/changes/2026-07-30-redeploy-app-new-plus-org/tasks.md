## 1. Prerequisites (confirm before touching config)

- [ ] 1.1 **(manual)** Confirm the exact target store (myshopify.com domain) within the target Shopify Plus organization that the app should be installed on.
- [ ] 1.2 **(manual)** Confirm the real hosting URL this app is (or will be) deployed at. `shopify.app.toml` currently has `application_url = "https://example.com"`, a placeholder — the actual URL isn't recorded anywhere in this repo (no `fly.toml`/`render.yaml`, only a generic `Dockerfile`).
- [ ] 1.3 **(manual)** Confirm access to create a new app in the Partners dashboard (which Partner org it should live under — can be the same Partner org as the old app; that's not what caused the original error).

## 2. Create the new app registration

- [ ] 2.1 **(manual, browser)** In the Partners dashboard, create a new app.
- [ ] 2.2 **(CLI, interactive login required)** Run `npm run config:link` (`shopify app config link`) from the repo root and select the newly created app. This relinks `shopify.app.toml`'s `client_id`.
- [ ] 2.3 Update `application_url` and `auth.redirect_urls` in `shopify.app.toml` to the real hosting URL confirmed in 1.2.
- [ ] 2.4 Update the hosting environment's `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` to the new app's credentials (shown in the Partners dashboard app overview).

## 3. Deploy

- [ ] 3.1 **(CLI, interactive login required)** Run `npm run deploy` (`shopify app deploy`) to register the `freebie-gwp-pricing` function extension under the new app.
- [ ] 3.2 Confirm the deploy succeeds and the extension appears under the new app in the Partners dashboard.

## 4. Set up custom distribution and install

- [ ] 4.1 **(manual, browser)** In the new app's Partners dashboard page, set Distribution to Custom.
- [ ] 4.2 **(manual, browser)** Generate the install link, entering the target store's domain (confirmed in 1.1) directly — this is the step that binds the app to that store's Plus organization. Do this deliberately; there's no documented way to change it afterward.
- [ ] 4.3 **(manual)** Share the install link with whoever administers the target store.
- [ ] 4.4 **(manual)** Target store's admin opens the link and approves the install.

## 5. Verify

- [ ] 5.1 Confirm the app appears as installed on the target store, with the `write_cart_transforms` scope granted.
- [ ] 5.2 Confirm the `app/uninstalled` and `app/scopes_update` webhook subscriptions are registered for the new app/store.
- [ ] 5.3 Smoke-test the `freebie-gwp-pricing` cart transform on the target store: add a paired main + freebie product to cart and confirm pricing behaves as expected.

## 6. Cleanup (no action required)

- [ ] 6.1 **(decision, not required)** Decide whether to leave the old app registration (`client_id = e8d7bcc37aee58589c083004d1dbf219`) in the Partners dashboard unused, or delete it. Purely a housekeeping choice — it has no functional effect either way.
