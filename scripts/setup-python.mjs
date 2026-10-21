import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
const win = process.platform === 'win32';
const venvPython = path.resolve('.venv', win ? 'Scripts/python.exe' : 'bin/python');
function run(binary, args) {
  const result = spawnSync(binary, args, { stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) {
    throw new Error(`${binary} ${args.join(' ')} failed: ${result.error?.message || `exit ${result.status}`}`);
  }
}
try {
  if (!existsSync(venvPython)) {
    const python = process.env.SUPER_VEL_BOOTSTRAP_PYTHON || (win ? 'python' : 'python3');
    run(python, ['-m', 'venv', '.venv']);
  }
  run(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', 'requirements-math.txt']);
  run(venvPython, ['-c', 'import numpy, scipy, sympy; print("SUPER VELOREN Python science dependencies ready")']);
} catch (err) {
  console.error('[SUPER VELOREN Python setup]', err.message);
  process.exit(1);
}
