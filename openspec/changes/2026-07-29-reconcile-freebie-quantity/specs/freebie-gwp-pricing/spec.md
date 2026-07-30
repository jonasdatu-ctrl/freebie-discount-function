## MODIFIED Requirements

### Requirement: Freebie price zeroed when a paired main product is present

The system SHALL, for every cart line tagged with the custom attribute `_freebiegwp_role: "freebie"`, set the price of up to `N` of its units to zero, where `N` is the number of its units still covered by the pooled quantity of `_freebiegwp_role: "main"` lines sharing its exact `_freebiegwp` value (see "Freebie quantity capped at paired main product quantity" for how `N` is computed and allocated).

#### Scenario: Freebie has a matching main product in cart, quantities equal

- **WHEN** the cart contains a line tagged `_freebiegwp: "T1"`, `_freebiegwp_role: "freebie"` with quantity 1, and another line tagged `_freebiegwp: "T1"`, `_freebiegwp_role: "main"` with quantity 1
- **THEN** the freebie line's price is set to zero at checkout, in full

## ADDED Requirements

### Requirement: Freebie quantity capped at paired main product quantity

The system SHALL free at most 1 freebie unit per 1 unit of pooled, paired main-product quantity sharing the same `_freebiegwp` value, live on every cart evaluation. Freebie quantity beyond what the pool covers SHALL remain at full price. A freebie line whose quantity exceeds the pool it can draw from SHALL have its free and full-price portions split into separate priced components on that line rather than being priced uniformly.

#### Scenario: Freebie quantity increased above main product quantity

- **WHEN** the cart contains a main-role line tagged `_freebiegwp: "T1"` with quantity 1, and a freebie-role line tagged `_freebiegwp: "T1"` with quantity 2
- **THEN** 1 unit of the freebie line is priced at zero and the other unit is left at full price

#### Scenario: Main product quantity increased, freebie quantity unchanged

- **WHEN** the cart contains a main-role line tagged `_freebiegwp: "T1"` with quantity 2, and a freebie-role line tagged `_freebiegwp: "T1"` with quantity 1
- **THEN** the freebie line's price is set to zero in full (its single unit is fully covered by the pool)

#### Scenario: Freebie quantity increased to match an increased main product quantity

- **WHEN** the cart contains a main-role line tagged `_freebiegwp: "T1"` with quantity 2, and the freebie-role line tagged `_freebiegwp: "T1"` is increased from quantity 1 to quantity 2
- **THEN** both units of the freebie line are priced at zero

### Requirement: Main product quantity pooled across multiple main lines in the same campaign

The system SHALL, when multiple `_freebiegwp_role: "main"` lines share the same `_freebiegwp` value, sum their quantities into a single shared pool available to pair against that value's freebie line(s).

#### Scenario: Two main lines, same campaign, quantities combine

- **WHEN** the cart contains two main-role lines both tagged `_freebiegwp: "T1"` with quantity 1 each, and a freebie-role line tagged `_freebiegwp: "T1"` with quantity 2
- **THEN** both units of the freebie line are priced at zero

### Requirement: Freebie pool allocated across multiple freebie lines in cart order

The system SHALL, when multiple `_freebiegwp_role: "freebie"` lines share the same `_freebiegwp` value and its pooled main quantity is insufficient to cover all of them, allocate the pool to freebie lines in the order they appear in the cart, exhausting the pool before later lines receive any free units.

#### Scenario: Two freebie lines share a pool smaller than their combined demand

- **WHEN** the cart contains a main-role line tagged `_freebiegwp: "T1"` with quantity 1, and two freebie-role lines both tagged `_freebiegwp: "T1"` with quantity 1 each, in that cart order
- **THEN** the first freebie line's unit is priced at zero and the second freebie line's unit is left at full price
