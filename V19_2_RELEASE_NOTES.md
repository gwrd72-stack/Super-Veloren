# SUPER VELOREN V19.2 — Investigation Follow-Through

## Delivered
- `src/investigation-192.js`: bounded multi-round public research with genuinely distinct follow-up queries, objective-term coverage, evidence deduplication and source-host visibility.
- `POST /api/v192/investigate`: Master-only live investigation using configured Wikipedia, Crossref, and optional Brave adapters.
- `src/investigation-192-test.js`: offline mock-response tests for query variation, coverage, invalid references, source diversity, duplicate detection and authorization route syntax.
- `npm run test:192`: new tests plus inherited V19.1 regression suite.

## Honest boundaries
Coverage is based on keywords and not proof that a source is correct. Source host diversity is not independent corroboration. External network connectivity, licensed dark-web sources, deep investigative accuracy, and independent security validation are not established by this release. Do not enter passwords, stolen content or personal secrets into intelligence queries. Approval gates and existing Master Authority remain in place.

## Setup
1. Extract into its own folder and run `npm install` and `python -m pip install -r requirements-math.txt`.
2. Configure `SUPER_VEL_MASTER_TOKEN` using the existing authority documentation.
3. Run `npm run test:192` and `npm start`.
4. Call `POST /api/v192/investigate` with a JSON object such as `{"objective":"spectrometer calibration frequency measurements","providers":["wikipedia","crossref"],"project":"X-Files"}` and your configured master credentials as described in prior release notes.
5. Optional Brave search requires `BRAVE_SEARCH_API_KEY`.

## Test scope
New 15 assertions and inherited V19.1 regression command passed locally. No live provider test or independent quality evaluation was performed.
