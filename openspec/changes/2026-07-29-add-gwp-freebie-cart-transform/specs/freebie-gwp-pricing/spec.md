## ADDED Requirements

### Requirement: Freebie price zeroed when a paired main product is present

The system SHALL, for every cart line tagged with the custom attribute `_freebiegwp_role: "freebie"`, set that line's price to a fixed amount of zero whenever another cart line exists with a matching `_freebiegwp` value and `_freebiegwp_role: "main"`.

#### Scenario: Freebie has a matching main product in cart

- **WHEN** the cart contains a line tagged `_freebiegwp: "T1"`, `_freebiegwp_role: "freebie"` and another line tagged `_freebiegwp: "T1"`, `_freebiegwp_role: "main"`
- **THEN** the freebie line's price is set to zero at checkout

#### Scenario: Freebie quantity is not reconciled against main product quantity

- **WHEN** the cart contains one main-role line tagged `_freebiegwp: "T1"` and two separate freebie-role lines both tagged `_freebiegwp: "T1"`
- **THEN** both freebie lines have their price set to zero; the system does not attempt to limit the discount to match main-product quantity

### Requirement: Freebie left at full price when unpaired

The system SHALL leave a cart line tagged `_freebiegwp_role: "freebie"` at its full price when no other cart line shares its `_freebiegwp` value with `_freebiegwp_role: "main"`.

#### Scenario: Main product removed from cart after freebie was added

- **WHEN** the cart contains a line tagged `_freebiegwp: "T1"`, `_freebiegwp_role: "freebie"` and no line tagged `_freebiegwp: "T1"`, `_freebiegwp_role: "main"`
- **THEN** the freebie line's price is left unchanged (full price)

#### Scenario: Attributes missing or malformed

- **WHEN** a cart line is missing the `_freebiegwp` or `_freebiegwp_role` attribute, or `_freebiegwp_role` has a value other than `"main"` or `"freebie"`
- **THEN** that line is not treated as part of any pairing and its price is left unchanged

### Requirement: Pairing is isolated per campaign via exact timestamp match

The system SHALL pair lines using an exact string match on `_freebiegwp`, so that multiple independent gift-with-purchase pairs can coexist in the same cart without cross-pairing.

#### Scenario: Two independent GWP pairs in the same cart

- **WHEN** the cart contains a main/freebie pair tagged `_freebiegwp: "T1"` and a separate, unrelated main/freebie pair tagged `_freebiegwp: "T2"`
- **THEN** each freebie line is paired only against lines sharing its own exact `_freebiegwp` value, and both pairs resolve independently to zero-priced freebies

### Requirement: No interaction with other discounts

The system SHALL apply the freebie price adjustment as a Cart Transform, which runs before Discount functions in Shopify's cart calculation pipeline, so that it does not require any "combines with" configuration against other discounts (including the store's existing automatic discount on the main product) to function correctly.

#### Scenario: Main product also has an active automatic discount

- **WHEN** the main product line has the store's existing automatic discount applied to it, and its paired freebie line is present
- **THEN** the freebie line's price is zeroed by this system before the automatic discount is evaluated, and the automatic discount continues to apply to the main product line exactly as it would without this system installed
