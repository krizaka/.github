# Continuity and backups

> ISO/IEC 27001:2022 Annex A 5.29, 5.30, 8.13, 8.14. Status: draft, **à valider par l'avocat** for the legal references. What is not tested is written « planned ».

| Topic | State |
| :--- | :--- |
| Backups of the production databases | Exist (the hosting supplier's managed backups) |
| A tested restore | **Planned** — krizaka/krizaka-infra#15 |
| Recovery targets (data loss, restore time) | **Planned** — set in krizaka-infra#15 from the first measured restore; no figure is published before |
| Redundancy, high availability, failover | **Planned** — not in place; never claimed until krizaka-infra tests them |
| Canadian hosting | **Planned** — region to confirm per supplier (.github#285) |

## Degraded modes

Each product says what still works when a supplier is down: the public site stays up from the CDN, an Orazaka run that cannot reach the GPU workers fails cleanly and is retried, payments wait for the processor. The founder decides when to declare a disruption and tells users on the status page (krizaka-infra#13, planned).

## Review

After each restore test and at the yearly management review.
