import crypto from 'node:crypto';
import { assessPredictions, evidenceGate } from './assurance-174.js';
import { signalDiagnostics, oscillatorDiagnostics } from './capability-177.js';
import { scoreReproducibility178 } from './research-cycle-178.js';
import { searchResearch,recordResearch } from './research-176.js';
import { reasonWithModel } from './intelligence.js';

// Untrusted model output is a suggestion, not executable code or authority.
const actions=Object.freeze({predictions:assessPredictions,evidence:evidenceGate,signal:signalDiagnostics,oscillator:oscillatorDiagnostics,reproducibility:scoreReproducibility178});
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const validText=(x,min,max)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
function parsePlan(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!validText(input.objective,10,2000))return {ok:false,error:'Research objective must be 10–2000 characters'};
 if(!Array.isArray(input.steps)||input.steps.length<1||input.steps.length>6)return {ok:false,error:'Plan requires 1–6 steps'};
 const steps=[];
 for(let i=0;i<input.steps.length;i++){
  const s=input.steps[i];
  if(!s||typeof s!=='object'||!Object.hasOwn(actions,s.tool)||!s.args||Array.isArray(s.args)||typeof s.args!=='object')return {ok:false,error:`Step ${i+1} must use an approved analytical tool`};
  let serial;try{serial=JSON.stringify(s.args);}catch{return {ok:false,error:'Arguments are not JSON serializable'};}
  if(!serial||serial.length>30000)return {ok:false,error:`Step ${i+1} exceeds the input limit`};
  steps.push({tool:s.tool,args:s.args});
 }
 const plan={objective:input.objective.trim(),steps};
 return {ok:true,plan,planHash:hash(plan),tools:Object.keys(actions),externalActions:false};
}
export function prepareInvestigation179(input={}){return parsePlan(input);}
export function executeInvestigation179(input={}){
 const result=parsePlan(input);
 if(!result.ok)return result;
 if(input.approved!==true||input.planHash!==result.planHash)return {ok:false,error:'Explicit Master approval and exact planHash are required. Prepare and review the plan first.',planHash:result.planHash};
 const findings=result.plan.steps.map((s,index)=>{
  let output;try{output=actions[s.tool](s.args);}catch{output={ok:false,error:'Tool failed validation or calculation'};}
  return {index,tool:s.tool,ok:output?.ok===true,output};
 });
 const failed=findings.filter(x=>!x.ok).length;
 return {ok:true,planHash:result.planHash,findings,passed:findings.length-failed,failed,conclusion:failed?'Partial results: investigate invalid or failed analyses':'Analytical steps completed; underlying scientific hypothesis NOT independently verified',limitations:['No model-generated code execution','No web access or external action','Source provenance and scientific claims need independent verification']};
}
function extractJSONObject(text){
 const raw=String(text||'').trim();let body=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
 try{return JSON.parse(body);}catch{return null;}
}
export async function proposeInvestigation179(input={}){
 if(!validText(input.objective,10,2000))return {ok:false,error:'Research objective required'};
 const context=input.memoryQuery?await searchResearch({query:String(input.memoryQuery).slice(0,200)}):null;
 const model=await reasonWithModel({problem:input.objective,observations:JSON.stringify({observations:String(input.observations||'').slice(0,2500),priorResearch:context?.hits?.slice(0,4)||[]}),constraints:'Return ONLY a JSON object with objective and steps. Each step must contain tool and args. Allowed tools: predictions({observed:number[],predicted:number[]}), evidence({records:array}), signal({samples:number[],sampleRate:number}), oscillator({mass:number,stiffness:number,damping?:number,x0?:number,v0?:number,dt?:number,steps?:number}), reproducibility({runs:number[]}). Limit to 6 steps. NEVER invent measurements; if there are insufficient measurements, explain this and return no plan. No external actions.'});
 if(!model.ok)return {ok:false,error:model.error,needsConfiguration:!process.env.OPENAI_API_KEY};
 const candidate=extractJSONObject(model.answer);
 if(!candidate)return {ok:false,error:'Model did not return valid structured JSON. No operations executed.',rawProposal:model.answer.slice(0,5000)};
 const plan=parsePlan(candidate);
 if(!plan.ok)return {ok:false,error:'Model proposed an invalid plan: '+plan.error,rawProposal:model.answer.slice(0,5000)};
 return {...plan,requiresMasterApproval:true,autoExecuted:false,model:model.model};
}
export async function executeAndRecord179(input={}){
 const run=executeInvestigation179(input);if(!run.ok)return run;
 if(!input.researchId)return run;
 const entry=await recordResearch(input.researchId,{kind:'observation',description:`V17.9 approved tool analysis ${run.planHash}; ${run.passed} checks passed, ${run.failed} failed. Results are calculations, not physical verification.`,source:'super-veloren:v17.9'});
 return {...run,recording:entry.ok?'saved':entry.error||'not saved'};
}
