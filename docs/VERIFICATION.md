# Verification guide

## Actors

- Authority wallet: creates the case, pins OEM then regulator evidence, and seals the dossier.
- Owner wallet: must be distinct and accepts the exact dossier digest.
- Assessment/finalization caller: permissionless after acceptance.

## Happy path

1. Deploy `contracts/recall_route.py` and configure the frontend address.
2. Create `RR-48-001` for model `BAT-XR48`, serial `XR48001482`, batch `NS-24-Q2`, purchase date `2026-03-14`, region `DEMO-EU`.
3. Add `samples/oem-recall.txt` as source `0 / OEM`, then `samples/regulator-recall.txt` as source `1 / REGULATOR`. Use raw GitHub URLs pinned to the exact full commit plus each file's SHA-256, byte length, and unique citation.
4. Seal the case; save the returned digest.
5. Switch to the owner wallet and accept that exact digest.
6. Call `assess_case`, wait for finality, and read `get_case`.
7. Call `finalize_case` and read back the finalized route.

Expected demo result: `AFFECTED`, `STOP_USE`, `REPLACE`, with all five scope relations `MATCH`, sufficient coverage, and no contradiction.

## Adversarial paths

- Out-of-range serial should route `NOT_AFFECTED` only when all other required facts are explicit and the sources agree.
- Missing fact, partial coverage, or source disagreement must route `MANUAL_REVIEW`.
- Changed bytes, wrong length, duplicate/missing citation, non-commit URL, malformed model output, pre-acceptance assessment, wrong owner, and replay must fail without advancing state.
