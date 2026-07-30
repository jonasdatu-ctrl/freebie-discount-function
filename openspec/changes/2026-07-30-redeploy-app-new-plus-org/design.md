## Context

Explored and confirmed during discovery (see conversation; corroborated against [Shopify's distribution docs](https://shopify.dev/docs/apps/launch/distribution/select-distribution-method) and the [custom-app-on-multiple-Plus-stores changelog](https://shopify.dev/changelog/install-custom-apps-on-multiple-shopify-plus-stores)):

- A Shopify app registration (`client_id`) belongs to exactly one Partner organization — but that's not what caused the install error. The Partner org that *owns* the app is unrelated to which Plus org can *install* it.
- Custom distribution binds an app to a specific Shopify Plus organization at the point the first install link is generated for a store in that org. There's no documented dashboard action to change that binding afterward. (Community reports show even adding a *second store in the same org* required a Partner Support ticket for apps created before July 2023 — rebinding to a *different* org is further outside self-serve territory, and not something to assume is even possible on request.)
- This repo's app (`client_id = e8d7bcc37aee58589c083004d1dbf219`) was only ever installed to a development store, and hit exactly this error when attempting to install on the actual target Plus org's store — confirming it's already bound elsewhere.
- Nothing is live on that app: no real merchant, no data, no webhook history worth preserving.

Given that, filing a Partner Support ticket to attempt an undocumented rebind isn't worth pursuing — a fresh app registration is faster, guaranteed to work, and costs nothing since the old one isn't in use.

## Goals / Non-Goals

**Goals:**
- Get this app installed and running on the target Shopify Plus organization's store, via a new app registration whose *first* custom-distribution install link is generated directly against that org.
- Keep the change scoped to configuration/deployment — no application or extension code changes.

**Non-Goals:**
- Reusing or rebinding the existing (Org A) app registration.
- Building reusable infrastructure for deploying this app to multiple orgs repeatedly — this is a one-off. (The `config:link` / `config:use` npm scripts already in `package.json` are standard Shopify CLI scaffolding for exactly this kind of multi-config scenario, so nothing new needs to be built if a similar move is needed again later — but setting that up isn't part of this change.)
- Migrating merchant data, sessions, or webhook subscriptions — none exist on the old app.
- Automating the Partners-dashboard or install-approval steps — these are inherently manual, browser-based, human actions (app creation, distribution setup, install consent) and out of reach of anything run from this repo.

## Decisions

**1. Create a new app registration rather than requesting a rebind of the existing one.** The existing app's Plus-org binding isn't documented as changeable, and even the closest documented precedent (multi-store-same-org access) required Partner Support intervention. With nothing live on the old app, a fresh registration is strictly faster and has no downside.

**2. Relink the primary `shopify.app.toml` directly to the new app, rather than adding a second named config file (`shopify.app.<name>.toml`).** This is a one-off move, not an ongoing multi-org deployment pattern — a second config file would be dead scaffolding immediately after this change lands. If a similar move is ever needed again, `shopify app config link` can create a named config at that time.

**3. The real hosting URL is currently unknown to this change** — `shopify.app.toml` has `application_url = "https://example.com"`, a placeholder, and there's no `fly.toml`/`render.yaml`/hosting config in the repo (only a generic `Dockerfile`), so wherever this is actually deployed is managed outside this repo. This has to be resolved (confirmed with whoever manages hosting) before `application_url` / `auth.redirect_urls` can be set correctly and before OAuth will work — flagged as a task, not assumed.

**4. The Custom-distribution install link must be generated directly against the target Plus org's store on the very first try.** Since this is the step that locks in the org binding, it should only be done once the correct store's domain is confirmed — not as a placeholder/test run.

## Risks / Trade-offs

- **Several steps are inherently manual and browser-based** (creating the app in Partners dashboard, setting distribution to Custom, generating the install link, and the target store's admin approving the install) — none of this can be scripted or run from this repo. `tasks.md` marks these explicitly so it's clear what requires hands-on action versus what can be run as a command.
- **The real hosting URL is an open unknown** — if hosting isn't already provisioned for this deployment, that's a prerequisite blocking task, not something this change can resolve on its own.
- **`shopify app deploy` will trigger an interactive browser login/consent flow** tied to whichever Partners account is active locally — needs to be run at a keyboard, not unattended.
- **Abandoning the old app registration is treated as consequence-free** based on the confirmation that it was never installed anywhere but a dev store. If that turns out to be wrong (e.g. it's referenced by some other integration or billing record), that assumption should be revisited before proceeding.
