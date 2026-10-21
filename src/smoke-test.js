import { localBrain } from './ai.js';

const tests = [
  ['what is 2 plus 2?', '4'],
  ['who are you?', 'Super Vel'],
  ['what is MXCL?', '0 Source'],
  ['Master Law: Drafts are not law until crowned.', 'saved'],
  ['Correction: answer simple questions directly before MXCL.', 'saved'],
  ['Super Vel, create the Reality-Tapping Bell Architecture Sheet using MXCL.', 'Reality-Tapping Bell'],
  ['Crown this cycle', 'Crown']
];

let failed = 0;
for (const [input, expected] of tests) {
  const r = await localBrain(input);
  const ok = (r.answer || '').toLowerCase().includes(expected.toLowerCase()) || (r.status || '').toLowerCase().includes(expected.toLowerCase());
  console.log(ok ? 'PASS' : 'FAIL', input, '=>', r.status, String(r.answer).slice(0,120).replace(/\n/g,' '));
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log('All Super Vel Command Core smoke tests passed.');
