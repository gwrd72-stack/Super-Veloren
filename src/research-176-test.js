import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {startResearch,recordResearch,readResearch,searchResearch,runResearchTools,proposeResearch} from './research-176.js';
const original=process.cwd(),dir=await mkdtemp(path.join(os.tmpdir(),'vel176-'));let checks=0;
try{process.chdir(dir);const bad=await startResearch({objective:'short'});assert.equal(bad.ok,false);checks++;
const created=await startResearch({objective:'Investigate anomalous resonant measurements compared to control observations',project:'X-Files'});assert.equal(created.ok,true);checks++;
const first=await recordResearch(created.id,{kind:'observation',description:'Measured 120 hertz at baseline'});assert.equal(first.ok,true);checks++;
const second=await recordResearch(created.id,{kind:'correction',description:'Sensor calibration is not yet confirmed'});assert.equal(second.ok,true);checks++;
const stored=await readResearch(created.id);assert.equal(stored.integrity,'pass');assert.equal(stored.mission.events.length,2);checks+=2;
const find=await searchResearch({query:'calibration'});assert.equal(find.hits.length,1);checks++;
const invalid=await recordResearch(created.id,{kind:'credential',description:'bad'});assert.equal(invalid.ok,false);checks++;
const tool=runResearchTools({steps:[{tool:'predictions',args:{observed:[1,2,3,4,5],predicted:[1,2,3,4,5]}}]});assert.equal(tool.allPassed,true);checks++;
assert.equal(runResearchTools({steps:[{tool:'shell',args:{command:'whoami'}}]}).ok,false);checks++;
assert.equal(runResearchTools({steps:Array.from({length:7},()=>({tool:'evidence',args:{}}))}).ok,false);checks++;
const prop=await proposeResearch({objective:'Investigate unexplained frequency-dependent oscillation effects'});assert.equal(prop.ok,false);checks++;
console.log(`V17.6: ${checks} checks passed`);
}finally{process.chdir(original);await rm(dir,{recursive:true,force:true});}
