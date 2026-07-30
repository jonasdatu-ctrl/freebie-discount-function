## Why

The app is currently registered in the Partners dashboard under `client_id = "e8d7bcc37aee58589c083004d1dbf219"` (`shopify.app.toml`). That app was previously installed only on a development store, and custom app distribution binds an app to a Shopify Plus organization the moment the first install link is generated for a store in that org — there's no documented self-serve way to rebind it afterward. Attempting to install this app on a store belonging to a different Plus organization was blocked with Shopify's "must be part of the same organization" error, confirming the app is already locked to the wrong org.

Nothing is live on the current app registration (no real merchant install, no data), so there's nothing worth preserving. The fastest, lowest-risk fix is a brand-new app registration, deployed and distributed fresh against the correct target Plus organization from the first install link onward — rather than filing a Partner Support ticket to attempt an undocumented rebind of the existing app.

## What Changes

- A new app is created in the Partners dashboard (new `client_id`), replacing the app identity this repo deploys against. The old app registration is left in place, unused — no action needed on it.
- `shopify.app.toml` is relinked (`shopify app config link`) to the new app's `client_id`.
- `application_url` and `auth.redirect_urls` in `shopify.app.toml` are updated from their current placeholder (`https://example.com`) to the app's real hosting URL.
- The hosting environment's `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` are updated to the new app's credentials.
- `shopify app deploy` is run to register the `freebie-gwp-pricing` function extension under the new app.
- The new app's distribution is set to Custom, and the first install link is generated directly against the target Plus organization's store — this is the step that determines which org the app is bound to, so it has to be correct on the first try.
- The app is installed on the target store via that link (manual approval by whoever administers that store).

Explicitly out of scope:
- Any attempt to rebind the existing (Org A) app registration to a different Plus org, including contacting Partner Support — abandoned in favor of a fresh registration since nothing is live on it.
- Any change to `freebie-gwp-pricing` function behavior, pricing logic, or specs — this is a deployment/distribution change only.
- Setting up reusable multi-org config scaffolding (multiple `shopify.app.<name>.toml` files) — this is a one-off move, not a recurring per-client deployment pattern.

## Capabilities

No capability changes. This is an infrastructure/deployment change — the app's registered identity and distribution target change, not its behavior.

## Impact

- `shopify.app.toml`: `client_id`, `application_url`, `auth.redirect_urls` updated to the new app.
- Hosting environment config: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET` updated.
- Partners dashboard: new app object created; distribution and install link configured on it (manual, browser-based — not scriptable).
- `extensions/freebie-gwp-pricing`: re-registered under the new app on next `shopify app deploy`; no code changes.
- The old app registration (`e8d7bcc37aee58589c083004d1dbf219`) becomes unused. No merchant, data, or webhook history exists on it to migrate.
