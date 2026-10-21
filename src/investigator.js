/** Deterministic, auditable research planning and verification. No unsupported claims of independent discovery. */
import crypto from 'node:crypto';
import {analyze,getCases,mutateCases} from './research.js';
import {physics} from './physics.js';
const METHODS=new Set(['describe','compare','fit','spectrum','montecarlo']);
const PHYSICS=new Set(['oscillator','rlc','projectile','inverse_square','resonance']);
const safe=(s,max=2000)=>typeof s==='string'&&s.trim()&&s.length<=max?s.trim():null;
const fingerprint=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
function design(c){
 const signals=c.evidence.filter(x=>x.kind==='measurement').length;
 const counters=c.evidence.filter(x=>x.kind==='counterevidence').length;
 const sources=new Set(c.evidence.map(x=>x.source.trim().toLowerCase())).size;
 const tasks=[
  {id:'operationalize',type:'protocol',status:'pending',instruction:'Define a measurable outcome, units, sampling protocol, and a predicted magnitude before collecting additional observations.'},
  {id:'baseline',type:'control',status:'pending',instruction:'Measure a baseline and a negative control under the same instrument settings, blind the analyst where practical.'},
  {id:'calibration',type:'instrument',status:'pending',instruction:'Log instrument calibration, noise floor, collection conditions, and timestamps.'},
  {id:'replicate',type:'replication',status:'pending',instruction:'Repeat the experiment across independent days or instruments and log all runs, including null results.'},
  {id:'alternatives',type:'falsification',status:'pending',instruction:'Specify at least two ordinary alternative explanations and one result that would falsify the hypothesis.'}
 ];
 return {case_id:c.id, hypothesis:c.hypothesis, evidence_items:c.evidence.length,independent_source_labels:sources,measurements:signals,counterevidence:counters,analysis_runs:c.tests.length,readiness:{has_measurements:signals>0,has_counterevidence:counters>0,has_multiple_sources:sources>=2,has_analysis:c.tests.length>0},tasks,conclusion:'UNVERIFIED: a research plan is not experimental evidence.'};
}
function classify(a,b,tolerance){
 if(!Number.isFinite(a)||!Number.isFinite(b))return {status:'unverified',reason:'Nonfinite outputs'};
 const error=Math.abs(a-b),scale=Math.max(1,Math.abs(a),Math.abs(b));
 return {status:error<=tolerance*scale?'pass':'fail',absolute_error:error,relative_scaled_error:error/scale,tolerance};
}
export function verify(input){
 if(!input||typeof input!=='object')return {ok:false,error:'Object required'};
 const a=input.observed,b=input.expected,tol=input.tolerance??1e-9;
 if(typeof a!=='number'||typeof b!=='number'||typeof tol!=='number'||!Number.isFinite(tol)||tol<=0||tol>0.1)return {ok:false,error:'Finite numeric values and tolerance (0, 0.1] required'};
 const result=classify(a,b,tol);
 return {ok:true,verification:'numeric-comparison',...result,important:'Only checks numerical agreement, not assumptions, model validity or measurement accuracy.'};
}
export async function getPlan(id){const c=(await getCases()).find(x=>x.id===id);return c?{ok:true,plan:design(c)}:{ok:false,error:'Case not found'};}
export async function runMission(id,input){
 if(!input||!Array.isArray(input.steps)||input.steps.length<1||input.steps.length>8)return {ok:false,error:'Provide 1–8 bounded analysis steps'};
 const current=(await getCases()).find(c=>c.id===id);if(!current)return {ok:false,error:'Case not found'};
 const tag=safe(input.label,120);if(!tag)return {ok:false,error:'Mission label required'};
 const steps=[];
 for(const item of input.steps){
  if(!item||typeof item!=='object')return {ok:false,error:'Invalid step'};
  const engine=item.engine, operation=item.parameters?.operation;
  if(!(engine==='research'&&METHODS.has(operation))&&!(engine==='physics'&&PHYSICS.has(operation)))return {ok:false,error:'Step must use an approved research or physics operation'};
  if(JSON.stringify(item).length>50000)return {ok:false,error:'Step too large'};
  const response=engine==='research'?await analyze(item.parameters):await physics(item.parameters);
  const record={index:steps.length+1,engine,operation,input_hash:fingerprint(item.parameters),status:response.ok?'computed':'error',output:response};
  steps.push(record);
  if(!response.ok)break;
 }
 const mission={id:crypto.randomUUID(),label:tag,createdAt:new Date().toISOString(),caseId:id,status:steps.length===input.steps.length&&steps.every(x=>x.status==='computed')?'computed':'incomplete',steps,conclusion:'UNVERIFIED: calculations do not prove the case hypothesis. Examine uncertainty, confounds, and replication.'};
 const stored=await mutateCases(cases=>{const c=cases.find(x=>x.id===id);if(!c)return false;if(!c.missions)c.missions=[];if(c.missions.length>=100)return false;c.missions.push(mission);return true;});
 if(!stored)return {ok:false,error:'Case missing or mission limit reached'};
 return {ok:true,mission,plan:design((await getCases()).find(x=>x.id===id))};
}
