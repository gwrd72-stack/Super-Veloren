import assert from 'node:assert/strict';
import {verify,getPlan,runMission} from './investigator.js';
import {createCase,mutateCases} from './research.js';
const tests=[];function check(name,fn){tests.push(Promise.resolve().then(fn).then(()=>console.log('PASS',name)));}
check('numeric verifier pass',()=>assert.equal(verify({observed:5,expected:5.0000000001}).status,'pass'));
check('numeric verifier fail',()=>assert.equal(verify({observed:5,expected:6}).status,'fail'));
check('reject malformed tolerance',()=>assert.equal(verify({observed:5,expected:5,tolerance:-1}).ok,false));
await Promise.all(tests);
const c=createCase({title:'V11 integration self-test',hypothesis:'A synthetic reference measurement has a mean of 2'});
await mutateCases(list=>{list.push(c);return c.id;});
try{
 const plan=await getPlan(c.id);assert.equal(plan.ok,true);assert.equal(plan.plan.tasks.length,5);console.log('PASS reproducible research plan');
 const mission=await runMission(c.id,{label:'Synthetic sample audit',steps:[{engine:'research',parameters:{operation:'describe',values:[1,2,3,2,2]}},{engine:'research',parameters:{operation:'montecarlo',values:[1,2,3,2,2],seed:42,trials:1000}}]});
 assert.equal(mission.ok,true,JSON.stringify(mission));assert.equal(mission.mission.status,'computed');assert.equal(mission.mission.steps.length,2);console.log('PASS chained bounded analysis and audit log');
 const failure=await runMission(c.id,{label:'Bad operation',steps:[{engine:'research',parameters:{operation:'execute'}}]});assert.equal(failure.ok,false);console.log('PASS reject disallowed operation');
}finally{await mutateCases(list=>{const i=list.findIndex(x=>x.id===c.id);if(i>=0)list.splice(i,1);return true;});}
