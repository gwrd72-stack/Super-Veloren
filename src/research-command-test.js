import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createDossier,modifyDossier,getDossier,assessDossier,verifyChain} from './research-command.js';
const original=process.cwd();const test=await fs.mkdtemp(path.join(os.tmpdir(),'vel-command-'));process.chdir(test);
try {
 const invalid=await createDossier({title:'x',objective:'no'});assert.equal(invalid.ok,false);
 const c=await createDossier({title:'Drive investigation',objective:'Test whether proposed propulsion model predicts measurable force'});assert(c.ok);
 const id=c.dossier.id;let result=await getDossier(id);assert(result.chainValid);assert.equal(result.assessment.readiness,'insufficient-evidence');
 const h=await modifyDossier(id,{action:'hypothesis',statement:'A measurable effect exists',prediction:'Force increases under input',falsifier:'Force is indistinguishable from controls'});assert(h.ok);
 const e=await modifyDossier(id,{action:'evidence',type:'measurement',description:'Instrument baseline',source:'local instrument log'});assert(e.ok);
 const bad=await modifyDossier(id,{action:'review',hypothesisId:'wrong',outcome:'supported',reviewer:'analyst',reason:'invalid'});assert(!bad.ok);
 const r=await modifyDossier(id,{action:'review',hypothesisId:h.item.id,outcome:'inconclusive',reviewer:'independent reviewer',reason:'Not enough data',evidenceIds:[e.item.id],independent:true});assert(r.ok);
 const v=await modifyDossier(id,{action:'validate-evidence',evidenceId:e.item.id,verified:true,replicated:true,method:'repeated instrument measurement',reviewer:'independent reviewer'});assert(v.ok);
 result=await getDossier(id);assert(result.chainValid);assert.equal(result.assessment.verifiedMeasurements,1);assert.equal(result.assessment.replications,1);
 const tampered=structuredClone(result.dossier);tampered.events[0].type='modified';assert.equal(verifyChain(tampered),false);
 const file=path.join(test,'data','research-command',id+'.json');const disk=JSON.parse(await fs.readFile(file,'utf8'));disk.events[0].type='modified';await fs.writeFile(file,JSON.stringify(disk));const blocked=await modifyDossier(id,{action:'hypothesis',statement:'t',prediction:'t',falsifier:'t'});assert.equal(blocked.ok,false);
 console.log('PASS: 10 research-command checks');
}finally{process.chdir(original);await fs.rm(test,{recursive:true,force:true});}
