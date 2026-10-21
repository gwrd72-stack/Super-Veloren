import assert from 'node:assert/strict';import {fuseFindings,compareSnapshots} from './fusion.js';
const findings=[{id:'1',title:'Transformer outage update',summary:'Grid transformer repair',origin:'feedA',collectedAt:new Date().toISOString(),confidence:'unverified'}, {id:'2',title:'New math publication',summary:'Graph theory',origin:'feedB',collectedAt:new Date().toISOString()}];
const projects=[{name:'Grid',keywords:['transformer','grid']},{name:'Music',keywords:['album']}];
let r=fuseFindings(findings,projects);assert.equal(r.ok,true);assert.equal(r.total,2);assert.equal(r.findings[0].id,'1');assert.equal(r.findings[0].projects[0].name,'Grid');assert.equal(r.findings[0].confidence,'unverified');assert.ok(r.findings[0].reason.length);assert.ok(r.clusters.length);assert.ok(r.caveat.includes('heuristic'));
assert.deepEqual(compareSnapshots([{id:'1',x:1}],[{id:'1',x:2},{id:'2'}]).added,['2']);assert.deepEqual(compareSnapshots([{id:'1',x:1}],[{id:'1',x:2}]).changed,['1']);assert.deepEqual(compareSnapshots([{id:'1'}],[]).removed,['1']);assert.equal(fuseFindings({},[]).ok,false);
console.log('PASS 11 fusion assertions');
