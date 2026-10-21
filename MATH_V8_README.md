# Super Vel V8 Mathematical Core

This upgrade preserves the original command router, MXCL commands, memory and UI. It adds an isolated Python/SymPy mathematical service invoked by Node through a bounded subprocess.

## Setup

1. Install Node.js 20+ and Python 3.10+.
2. In this project directory run `npm install`.
3. Run `python -m pip install -r requirements-math.txt` (Windows) or `python3 -m pip install -r requirements-math.txt`.
4. Run `npm test`, then `npm start`.
5. In the chat enter one of:

- `math: 2 + 2 * 7`
- `math: sqrt(2) + pi`
- `solve: x^2 - 5*x + 6 = 0`
- `differentiate: sin(x) * x^2`
- `integrate: x^2`
- `factor: x^2 - 9`
- `simplify: (x^2 - 1)/(x - 1)`
- `matrix: [[1,2],[3,4]]`

For derivatives/integrals/solve, append `with respect to y` for variable y. The engine accepts only approved expressions and a small symbol/function vocabulary.

**Constraints:** No arbitrary Python or JavaScript execution; 5-second child-process deadline; expression bounds; no network. Higher-level mathematical reasoning, statistical models, arbitrary datasets, verified physics simulators and formal proofs remain future work. Some complex symbolic problems may be slow and are terminated. No claim of production security audit.
