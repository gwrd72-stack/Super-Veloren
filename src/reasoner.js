import {analyze} from './research.js';
import {physics} from './physics.js';
import {discovery} from './discovery.js';
import {executeMath,formatMath} from './math.js';
import {createHash,randomUUID} from 'node:crypto';
const VALID = new Set(['research','physics','discovery','math']);
const MAX_STEPS=6;
const timestamp=()=>new Date().toISOString();
function assessment(request,steps){
 const passed=steps.filter(x=>x.ok).length;
 const failures=steps.filter(x=>!x.ok);
 const qualifiers=[];
 if (!steps.length) qualifiers.push('No computations performed.');
 if (failures.length) qualifiers.push(`${failures.length} computation(s) failed; no aggregate scientific conclusion supported.`);
 qualifiers.push('Successful numerical execution is not experimental validation or evidence of causation.');
 if (request.hypothesis) qualifiers.push('Hypothesis remains unverified without independent controlled measurements and attempts to falsify it.');
 return {calculations_passed:passed,calculations_total:steps.length,all_calculations_passed:steps.length>0&&!failures.length,scientific_conclusion:'not established',limitations:qualifiers};
}
export function validatePlan(body){
 if (!body||typeof body!=='object'||Array.isArray(body)) throw new Error('Expected JSON object');
 if(typeof body.question!=='string'||body.question.trim().length<8||body.question.length>1500)throw new Error('question must be 8-1500 characters');
 if(body.hypothesis!==undefined&&(typeof body.hypothesis!=='string'||body.hypothesis.length>1500))throw new Error('Invalid hypothesis');
 if(!Array.isArray(body.steps)||body.steps.length<1||body.steps.length>MAX_STEPS)throw new Error('Provide 1-6 research steps');
 const steps=body.steps.map((s,i)=>{
  if(!s||typeof s!=='object'||!VALID.has(s.engine)||!s.input||typeof s.input!=='object'||Array.isArray(s.input))throw new Error(`Invalid step ${i+1}`);
  const serialized=JSON.stringify(s.input);
  if(serialized.length>120000)throw new Error('Step input too large');
  return {engine:s.engine,input:s.input,reason:typeof s.reason==='string'?s.reason.slice(0,500):''};
 });
 return {question:body.question.trim(),hypothesis:(body.hypothesis||'').trim(),steps};
}
export async function executePlan(body){
 let request;
 try{request=validatePlan(body);}catch(e){return {ok:false,error:e.message};}
 const started=timestamp();const results=[];
 for(let i=0;i<request.steps.length;i++){
  const s=request.steps[i];let result;
  try{
   if(s.engine==='research')result=await analyze(s.input);
   else if(s.engine==='physics')result=await physics(s.input);
   else if(s.engine==='discovery')result=await discovery(s.input);
   else {const r=await executeMath(s.input);result=r;}
  }catch(e){result={ok:false,error:String(e.message||e).slice(0,240)};}
  results.push({index:i+1,engine:s.engine,reason:s.reason,ok:result?.ok===true,result});
 }
 const reproducibility={input_sha256:createHash('sha256').update(JSON.stringify(request)).digest('hex'),started,finished:timestamp(),software:'super-vel-v13',step_count:results.length};
 return {ok:true,id:randomUUID(),question:request.question,hypothesis:request.hypothesis,results,assessment:assessment(request,results),reproducibility};
}
export function critiqueEvidence(body){
 if(!body||typeof body!=='object'||typeof body.claim!=='string'||body.claim.trim().length<6||body.claim.length>2000)return {ok:false,error:'A claim is required'};
 const evidence=body.evidence;
 if(!Array.isArray(evidence)||evidence.length>100)return {ok:false,error:'Provide up to 100 evidence items'};
 const recognized=['measurement','replication','controlled_experiment','published_source','testimony','anecdote','counterevidence'];
 const normalized=[];
 for(let i=0;i<evidence.length;i++){
  const v=evidence[i];if(!v||!recognized.includes(v.type)||typeof v.summary!=='string'||v.summary.length>1500||!v.summary.trim()||typeof v.source!=='string'||v.source.length>500)return {ok:false,error:`Invalid evidence ${i+1}`};
  normalized.push({type:v.type,summary:v.summary,source:v.source,independent:v.independent===true,limitations:(typeof v.limitations==='string'?v.limitations:'').slice(0,500)});
 }
 const counts=Object.fromEntries(recognized.map(k=>[k,normalized.filter(e=>e.type===k).length]));
 const concerns=[];
 if(!counts.measurement)concerns.push('No recorded quantitative measurements supplied.');
 if(!counts.controlled_experiment)concerns.push('No controlled experimental evidence supplied.');
 if(!counts.replication)concerns.push('No replication evidence supplied.');
 if(!normalized.some(x=>x.independent))concerns.push('No independently gathered evidence identified.');
 if(counts.counterevidence)concerns.push('Counterevidence exists and requires explicit examination.');
 return {ok:true,claim:body.claim,evidence_count:normalized.length,counts,concerns,evidence:normalized,verdict:'not independently verified',next_steps:['Define measurable predictions and falsification conditions.','Record instrument calibration, controls and raw results.','Repeat with independent observers and equipment.'],caution:'Checklist only; evidence quality requires domain-specific expert review.'};
}
