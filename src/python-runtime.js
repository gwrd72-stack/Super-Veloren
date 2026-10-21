import path from 'node:path';
import { existsSync } from 'node:fs';
export function sciencePython() {
  if (process.env.SUPER_VEL_PYTHON) return process.env.SUPER_VEL_PYTHON;
  const local = path.resolve('.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  return existsSync(local) ? local : (process.platform === 'win32' ? 'python' : 'python3');
}
