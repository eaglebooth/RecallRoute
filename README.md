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

## Contract methods

Writes: `create_case`, `add_notice`, `seal_case`, `accept_case`, `assess_case`, `finalize_case`, `expire_to_manual_review`, `cancel_draft`.

Views: `get_contract_version`, `get_case`, `get_notice`, `get_counts`.

See [docs/VERIFICATION.md](docs/VERIFICATION.md), [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md), and the implementation plan in [plans/260908-recallroute/plan.md](plans/260908-recallroute/plan.md).
