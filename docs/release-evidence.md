# RecallRoute Studionet release evidence

Verified against contract [`0x68548Cbff3f0484DA738614A492BACF16B8EE672`](https://explorer-studio.genlayer.com/address/0x68548Cbff3f0484DA738614A492BACF16B8EE672) using repository fixture commit `3b46b66e90d9d96e0a6f8b887374a427cc0497d5`.

Actors:

- Authority: `0xeb57bc7125fa60d7482CE12058397369AB3581f8`
- Owner: `0x2da5393d7BBb9A037dc3abB56DbbC5C150fc843f`

## Affected route

Case `RR48-AFFECTED-1788855530011` finalized as `AFFECTED`, remedy `REPLACE`, immediate action `STOP_USE`.

- [Create](https://explorer-studio.genlayer.com/tx/0xc31113d48e865cedfc2600947d2fde7c653ec03d0779faf7d4ec2d627a34c01d)
- [Wrong digest rollback](https://explorer-studio.genlayer.com/tx/0x59eb7b58a895b2948ed8cf332c1510aaa7d2020287dacc49b546e90fc626fc37)
- [Owner accepts exact digest](https://explorer-studio.genlayer.com/tx/0x1c9da99bcb975ce3396c2e285e9198277d28c5dca1538af177e5fe1ff02706dd)
- [Independent assessment](https://explorer-studio.genlayer.com/tx/0xe92ec50b98661f098e9e895a331b75104f070f2db1181ce73450ab14e7441dda)
- [Finalize](https://explorer-studio.genlayer.com/tx/0x1dc84c93684980d2c03fe60e3281311e744660973d9ebfb561f368bb5a4d9116)

## Not-affected route

Case `RR48-NOTAFFECTED-1788855530011`, using out-of-range serial `XR48009999`, finalized as `NOT_AFFECTED` with no remedy or immediate action.

- [Independent assessment](https://explorer-studio.genlayer.com/tx/0x67dd7a7fae88d4e1302a31671796ba1455d75bba6a0440aa1a8a850d1f2e4bf4)
- [Finalize](https://explorer-studio.genlayer.com/tx/0xdb290b13bcaf29f929e88762992c404b807da69eca30abe372e99106aa02fa74)

## Conflicting-source route

Case `RR48-CONFLICT-1788855530011` used an adversarial regulator fixture that contradicted the OEM action and remedy. It finalized as `MANUAL_REVIEW`; the contract stored neither a remedy nor an immediate action.

- [Independent assessment](https://explorer-studio.genlayer.com/tx/0xed5e938aa82bc8f4d4003da98b425b9de3f0e31e658dadedd3f72d0f4f2070d9)
- [Finalize](https://explorer-studio.genlayer.com/tx/0x2bf7a3548bc8ba20971e9ae65bebc8c49832499e1df77daf88c724f5c284a73a)

## Source-failure rollback

Case `RR48-SOURCEFAIL-1788855530011` bound a commit-pinned but nonexistent regulator path. Assessment finalized as a rollback with `REGULATOR_SOURCE_UNAVAILABLE`. Authoritative readback before and after the failed assessment was identical and the case remained `READY`.

- [Finalized failure](https://explorer-studio.genlayer.com/tx/0xf1642b1b18efd96787828cf46c4dfc34b082697e574afc6c77090dc0795095af)

## Local gates

- `python -m pytest -q`: 35 passed before deployment.
- `npm run lint`: passed.
- `npm run build`: passed for `/` and `/console`.
- `npm run verify:studionet`: all four live scenarios completed.
