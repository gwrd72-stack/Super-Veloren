SUPER VELOREN V1.5 — PYTHON RESEARCH ENGINE PATCH

CAUSE: Render started the Node web server but the Python numerical engine crashed on import numpy: ModuleNotFoundError.

WHAT IS IN THIS PATCH:
- package.json: postinstall automatically creates .venv and installs requirements-math.txt during normal npm/yarn install.
- scripts/setup-python.mjs: Python virtual environment setup with visible errors and import verification.
- src/research.js: automatically chooses .venv Python, retaining SUPER_VEL_PYTHON override; logs actionable Python failures.
- requirements-math.txt: same compatible NumPy, SciPy, SymPy ranges as original.

INSTALL: Copy package.json, scripts/setup-python.mjs, src/research.js, and requirements-math.txt into the SAME paths in GitHub. Commit. Render redeploys. Render Build Command must run npm install, npm ci, or yarn install so postinstall runs. Do not change your working Start Command (node src/server.js).

RENDER: The log should show '[Super Vel] Python scientific engine ready' DURING BUILD. If you don't see it, check the Render Build Command. If it fails, see the build error and confirm the environment has python3/venv. No secret or API key needs to be placed in GitHub.

AFTER DEPLOY: Unlock Command and run Dataset Analyzer with 10, 20, 30, 40, 50. Mean and median should both be 30. Other Python based modules may still need path updates or separate dependencies and must be tested individually.

IMPORTANT: If current Render build does not invoke package-manager install hooks, set its Build Command to 'npm install' (or 'yarn install'). Do not use --ignore-scripts.
