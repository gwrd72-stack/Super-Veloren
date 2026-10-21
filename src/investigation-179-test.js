import assert from 'node:assert/strict';
import {prepareInvestigation179,executeInvestigation179,proposeInvestigation179} from './investigation-179.js';
const objective='Investigate repeatability of measured experimental readings';
const payload={objective,steps:[{tool:'reproducibility',args:{runs:[10,10,10,10]}}]};
const p=prepareInvestigation179(payload);assert.equal(p.ok,true);
assert.equal(executeInvestigation179(payload).ok,false);
assert.equal(executeInvestigation179({...payload,approved:true,planHash:'fake'}).ok,false);
const r=executeInvestigation179({...payload,approved:true,planHash:p.planHash});assert.equal(r.ok,true);assert.equal(r.passed,1);assert.equal(r.failed,0);assert.equal(r.findings[0].output.mean,10);
const changed={...payload,steps:[{tool:'reproducibility',args:{runs:[1,2,3]}}]};assert.equal(executeInvestigation179({...changed,approved:true,planHash:p.planHash}).ok,false);
assert.equal(prepareInvestigation179({...payload,steps:[{tool:'shell',args:{command:'rm -rf /'}}]}).ok,false);
assert.equal(prepareInvestigation179({...payload,steps:[]}).ok,false);
assert.equal(prepareInvestigation179({...payload,steps:Array(7).fill(payload.steps[0])}).ok,false);
const bad={objective,steps:[{tool:'predictions',args:{observed:[1],predicted:[1]}}]};let b=prepareInvestigation179(bad);let q=executeInvestigation179({...bad,approved:true,planHash:b.planHash});assert.equal(q.ok,true);assert.equal(q.failed,1);assert.equal(q.conclusion.startsWith('Partial'),true);
const missing=await proposeInvestigation179({objective});assert.equal(missing.ok,false); // no configured API key on test environment
console.log('V17.9: 12 checks passed');
