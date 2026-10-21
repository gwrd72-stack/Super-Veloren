import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {deviseMission,createMission,readMission,addMissionEvidence,listMissions,assessMission,researchBenchmark} from './mission-intelligence.js';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vel173-'));process.env.SUPER_VEL_RESEARCH_DIR=dir;
let n=0;const check=async(f)=>{await f();n++;};
try{
 await check(()=>assert.equal(deviseMission({objective:'x'}).ok,false));
 const p=deviseMission({objective:'Investigate anomalous electromagnetic signal measurements',authorizedSourcesConfirmed:false});
 await check(()=>assert.equal(p.ok,true));check(()=>assert.equal(p.type,'signal'));
 await check(()=>assert.equal(p.steps.some(x=>x.requiresApproval),true));
 const r=await createMission({objective:'Investigate laboratory resonance measurements'});check(()=>assert.equal(r.ok,true));
 await check(async()=>assert.equal((await listMissions()).missions.length,1));
 await check(async()=>assert.equal((await readMission(r.mission.id)).integrityValid,true));
 const added=await addMissionEvidence(r.mission.id,{kind:'measurement',claim:'Peak near 30 Hz',source:'calibrated sensor A',observation:'30.1 Hz at 1m'});check(()=>assert.equal(added.ok,true));
 await check(async()=>assert.equal((await readMission(r.mission.id)).mission.entries.length,1));
 await check(async()=>assert.equal((await addMissionEvidence(r.mission.id,{kind:'measurement',claim:'test'})).ok,false));
 const assess=assessMission({objective:'Investigate novel laboratory oscillation',evidence:[{claim:'A',source:'lab',observation:'A'}]});check(()=>assert(assess.gaps.length>0));
 await check(()=>assert.equal(researchBenchmark({tasks:[{expected:'4',candidate:'4'},{expected:'x',candidate:'y'}]}).accuracy,.5));
 await check(()=>assert.equal(researchBenchmark({tasks:[]}).ok,false));
 const file=path.join(dir,r.mission.id+'.json');const m=JSON.parse(await fs.readFile(file,'utf8'));m.entries[0].claim='modified';await fs.writeFile(file,JSON.stringify(m));
 await check(async()=>assert.equal((await readMission(r.mission.id)).integrityValid,false));
 await check(async()=>assert.equal((await addMissionEvidence(r.mission.id,{kind:'review',claim:'B',source:'lab'})).ok,false));
 console.log(`V17.3 mission intelligence: ${n} checks passed`);
}finally{await fs.rm(dir,{recursive:true,force:true});}
