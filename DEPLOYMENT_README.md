# SUPER VELOREN V1.5.1 — Clean repository deployment

Upload **the contents of this folder** to a NEW repository root, preserving `src/`, `public/`, and `scripts/`. Do not upload files from `src/` separately into the repository root.

## Render setup
- Service: Node Web Service
- Root directory: repository root (leave blank)
- Build command: `npm install`
- Start command: `node src/server.js`
- Required secret environment variable: `SUPER_VEL_MASTER_TOKEN` (32+ random characters)
- Optional: `OPENAI_API_KEY` for model-based research; authorized intelligence provider credentials if separately configured.
- Port comes from `PORT`; listener binds to `0.0.0.0`.

`npm install` executes `scripts/setup-python.mjs`, which creates `.venv` and installs `requirements-math.txt`. This requires Python 3 with venv and pip available in the build environment. A failed Python installation should fail the build, rather than silently giving a broken science UI.

## Verification
- `npm run test:deployment` — Node statistics + NumPy/SciPy/SymPy imports + algebra + oscillator.
- `npm run test:192` — inherited test suites (requires Node packages and configured token as applicable).
- `GET /api/health` — web process availability only.
- Master-authorized `GET /api/health/science` — verifies scientific dependencies.
- Statistics UI for `10, 20, 30, 40, 50` must show mean 30, median 30.

## Limits
This release has not been confirmed running end-to-end on Render. External search providers, AI API calls, secure persistent storage across redeployments, and dark-web intelligence sources need separate configuration and field tests. Free or ephemeral hosting may erase local project data during redeployment; use persistent storage before important cases.
