import assert from 'node:assert/strict';
import {mathRequest,executeMath} from './math.js';
const tests=[['math: 2+2*7',r=>r.exact==='16'],['solve: x^2-5*x+6=0',r=>r.solutions.includes('2')&&r.solutions.includes('3')],['differentiate: x^3',r=>r.result==='3*x**2'],['integrate: 2*x',r=>r.result.includes('x**2')],['matrix: [[1,2],[3,4]]',r=>r.determinant==='-2'],['math: __import__("os")',r=>false]];
let errors=0;
for(const [q,check] of tests){const r=await executeMath(mathRequest(q));const ok=q.includes('__import__')?!r.ok:r.ok&&check(r.result);console.log(ok?'PASS':'FAIL',q,JSON.stringify(r));if(!ok)errors++;}
if(errors)process.exit(1);
