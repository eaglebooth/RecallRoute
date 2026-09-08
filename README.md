# RecallRoute

RecallRoute is a bounded GenLayer Intelligent Contract and web console for routing one synthetic e-bike battery model (`BAT-XR48`) against two authoritative recall notices.

It answers one proof obligation: **does the exact, owner-accepted product identity fall inside the scope jointly stated by a byte-verified OEM notice and regulator notice?** The AI/validators return structured semantic relations; deterministic contract code derives `AFFECTED`, `NOT_AFFECTED`, or `MANUAL_REVIEW`.

> Demo only. The fixtures are synthetic and this software does not replace official manufacturer or regulator safety guidance.

## Architecture

- Authority creates a bounded case and pins exactly two commit-addressed sources.
- Owner accepts a digest covering all product facts, the assessment window, and both source policies.
- Validators independently fetch and verify exact bytes, compare five scope dimensions, and flag contradictions.
- The contract derives and finalizes a route. Unknown or partial evidence cannot become `AFFECTED` or `NOT_AFFECTED`.

## Local verification

```bash
python -m pytest -q
npm install
npm run lint
npm run build
npm run dev
```

Copy `.env.example` to `.env.local` after deployment and set `NEXT_PUBLIC_CONTRACT_ADDRESS`.

## Studionet deployment

- Contract: `0x68548Cbff3f0484DA738614A492BACF16B8EE672`
- Explorer: https://explorer-studio.genlayer.com/address/0x68548Cbff3f0484DA738614A492BACF16B8EE672
- Fixture commit: `3b46b66e90d9d96e0a6f8b887374a427cc0497d5`

The two-wallet live suite finalized `AFFECTED / REPLACE / STOP_USE`, `NOT_AFFECTED`, and conflicting-source `MANUAL_REVIEW` routes. It also verified finalized rollback for a wrong dossier digest and an unavailable regulator source. Full evidence is in [docs/release-evidence.md](docs/release-evidence.md).

## Contract methods

Writes: `create_case`, `add_notice`, `seal_case`, `accept_case`, `assess_case`, `finalize_case`, `expire_to_manual_review`, `cancel_draft`.

Views: `get_contract_version`, `get_case`, `get_notice`, `get_counts`.

See [docs/VERIFICATION.md](docs/VERIFICATION.md), [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md), and the implementation plan in [plans/260908-recallroute/plan.md](plans/260908-recallroute/plan.md).
