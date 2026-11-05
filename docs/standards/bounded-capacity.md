# Bounded capacity — nothing from outside can fill what we own

<!-- summary: Every write that accepts outside input is bounded: body size, per-client rate, a global ceiling per window, a storage ceiling, and a test that proves the refusal. -->

> Oussama, 2026-11-05: « les db etc. vont devoir avoir une limite (grande) pour ne pas avoir une attaque : la newsletter du
> blog accepte des courriels, mais si un milliard arrivent en une heure, on les enregistre et la base saute. Protéger nos
> assets du déni de service. C'est une consigne globale. »

**The rule:** every path that writes because of outside input is bounded. This covers:
- a form, a sign-up or a newsletter;
- an upload, a webhook or a public API;
- a job queue, a mail send.

The limits are large: a real user never meets them. They protect the database, the storage, the queues and the bill. Above a limit, the path refuses, and nothing is written.

## The five bounds

1. **Body size.** Read at most N bytes, then refuse with 413. Never parse first and measure after. A file has a size limit and a page or pixel limit.
2. **Per client.** Limit by address and by subject (the email, the account) with [`@krizaka/rate-limit`](https://ts.krizaka.com/packages/rate-limit). Add Turnstile, checked on the server, on anonymous forms.
3. **A global ceiling per window, whatever the address.** A botnet uses a million addresses, so the per-client limit is not enough.
   - Each action has a total per hour or per day: `limits.<action>.global`. Above it, the path answers 503 with `Retry-After`, alerts once, and writes nothing: this is the circuit breaker.
   - A global ceiling **fails closed**. If its store is down, the write is refused, never accepted unbounded.
4. **A storage ceiling.** Each table or bucket that grows from outside has a maximum per tenant and in total.
   - At 80 % of that maximum, an alert goes out.
   - At 100 %, new writes are refused, and reads keep working.
   - The database also bounds itself: `statement_timeout`, a fixed pool size, and no unbounded `SELECT`.
5. **Fan-out.** One request never queues an unbounded number of jobs, mails or calls to a provider. The fan-out is capped, and so is the queue's depth.

## Limits are settings

- The defaults are written in code, are large, and are justified with `// @fixed:`.
- An admin changes them without a redeploy, through `@krizaka/settings` (the registry fragment of `rateLimitSettings`).
- A limit is never 0 by accident: the settings schema refuses 0 and a missing value.

## Proof

A path counts as bounded only when a test sends one request over each limit and proves that:
- the refusal is a 413, 429 or 503;
- no row and no object was written;
- the alert was raised once.

A new public write path without these tests is a review blocker. The rule enters the org registry (`rules.json`) with its automated check once `@krizaka/rate-limit` carries the global ceiling, so a check can look for it.

## Where the inventory lives

The inventory of each path and its bounds is a security matter. It is private, kept by the security lane, never in an issue. This page only says the rule.
