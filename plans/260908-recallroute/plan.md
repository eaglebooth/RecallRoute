# RecallRoute implementation plan

## Goal

Build a deliberately bounded GenLayer dapp that routes one synthetic e-bike battery model, `BAT-XR48`, through an independently verified recall decision.

## Proof obligation

Determine whether the exact sealed product identity is inside the scope jointly described by one OEM notice and one regulator notice, and if so expose the supported immediate action and remedy. This is not a payout system, warranty court, identity registry, or general product search engine.

## State machine

1. Authority creates a draft case with owner, product facts, assessment window, and both exact source policies.
2. Authority adds exactly one OEM and one regulator notice, then seals the dossier digest.
3. Owner accepts that exact digest. No product fact or source may change afterward.
4. Any caller may trigger a validator assessment during the sealed observation window.
5. Validators independently fetch and byte-verify both sources, then return a bounded semantic tuple.
6. Deterministic code derives `AFFECTED`, `NOT_AFFECTED`, or `MANUAL_REVIEW` and separately records remedy/action.
7. A finalization call closes the case. An expired unresolved case can only become `MANUAL_REVIEW`.

## Safety gates

- Commit-pinned GitHub raw URLs only; exact origin, SHA-256, byte length, and unique citation.
- Owner accepts the entire dossier digest before assessment.
- Assessment is allowed only inside its precommitted window.
- Unknown, incomplete, malformed, contradictory, or inconsistent model output cannot produce a positive route.
- No reassessment, double finalization, source replacement, or alternate positive-state path.
- Synthetic demo data only; no production safety advice or automatic compensation.

## Verification

- Unit tests: roles, digest acceptance, source immutability, temporal boundaries, semantic truth table, malformed output, tampering, unique citations, replay and finalization.
- Frontend: production build, lint, wallet/version handshake, pending transaction recovery, readback.
- Studionet: deploy, run affected/not-affected/conflict/source-failure cases, record finalized transactions and authoritative readback.
