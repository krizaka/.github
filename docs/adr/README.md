# Organisation ADRs

Decisions that span several Krizaka repositories. A decision that belongs to one repository lives in that repository
(`krizaka-ui/docs/adr`, `orazaka/docs/adr`…).

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-krizaka-accounts.md) | The sign-in standard of every Krizaka product (krizaka-users, `SignInProviders`, linking by verified e-mail, native PKCE) and Krizaka accounts for the krizaka.com properties (a thin `krizaka-accounts` host with comments) | Accepted (runtime waits on cost approval) |
| [ADR-002](ADR-002-dev-preview-status-is-data.md) | « Dev preview » is a checkable bar (docs/standards/dev-preview.md); a product's status is data (`dev-preview.json`), gated at krizaka.com's build | Accepted |
| [ADR-003](ADR-003-mobile-service-discovery.md) | Mobile apps discover their backend addresses from a signed manifest on krizaka.com (`@krizaka/discovery`, Ed25519, host allow-list), so a URL change never forces a store republish | Accepted |
