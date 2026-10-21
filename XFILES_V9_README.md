# Super Vel V9 — X-Files Research Laboratory

This builds on V8. It is **not** a validated autonomous scientist and cannot certify extraordinary claims. Findings remain unverified until independently reproduced.

## Installation

From the `super_vel_command_core_v1` directory:

```
npm install
python -m pip install -r requirements-math.txt
npm run test:math
npm run test:research
npm start
```

## Research API examples

All use `Content-Type: application/json`.

- `POST /api/research/analyze`:
  - Describe: `{ "operation":"describe", "values":[1,2,3,4] }`
  - Compare groups: `{ "operation":"compare", "values":[1,2,3], "other":[3,4,5] }`
  - Fit trend: `{ "operation":"fit", "x":[0,1,2], "values":[1,3,5] }`
  - Frequency spectrum: `{ "operation":"spectrum", "sample_rate_hz":100, "values":[...] }` (8+ samples)
  - Reproducible bootstrap: `{ "operation":"montecarlo", "values":[1,2,3], "trials":1000, "seed":42, "threshold":2 }`
- `POST /api/research/cases`: `{ "title":"Study A", "hypothesis":"The signal exceeds noise" }`
- `GET /api/research/cases`: list cases.
- `POST /api/research/cases/:id/evidence`: `{ "kind":"measurement", "description":"...", "source":"..." }`
- `POST /api/research/cases/:id/tests`: same shape as analyze; saves input parameters and results to case.

Records are stored locally in `data/xfiles-cases.json`. Keep sensitive research on a protected machine. There is NO authentication: local-only bind is essential. The server uses bounded request sizes and inputs, but is not hardened for internet exposure. Case evidence is not cryptographically authenticated. The system does not independently verify real-world measurements.

## Next engineering phases
Sensor ingestion, calibration logs, error propagation, dimension checking, physical modeling (with documented assumptions), visual plots, provenance/hashes, controlled hypothesis selection, full integration tests, and local authentication.
