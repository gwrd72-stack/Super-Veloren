import crypto from 'node:crypto';
// Conservative evidence scoring: a disciplined review aid, never a scientific proof.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const normalized=s=>typeof s==='string'?s.trim().slice(0,4000):'';
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function evaluateClaims(input={}){
 const statement=normalized(input.claim), predictions=Array.isArray(input.predictions)?input.predictions:[], observations=Array.isArray(input.observations)?input.observations:[];
 if(statement.length<12||predictions.length<1||predictions.length>30||observations.length>200)return {ok:false,error:'Provide a claim and 1-30 predictions (up to 200 observations)'};
 const checks=[];let support=0,contradict=0,unknown=0;
 for(const [i,p] of predictions.entries()){
   const id=normalized(p?.id)||`prediction-${i+1}`;const expected=Number(p?.expected),tolerance=Number(p?.tolerance);
   if(!Number.isFinite(expected)||!Number.isFinite(tolerance)||tolerance<0||tolerance>1e12)return {ok:false,error:`Invalid numerical prediction: ${id}`};
   const matches=observations.filter(o=>o?.predictionId===id);
   if(matches.length===0){unknown++;checks.push({id,status:'unmeasured',reason:'No linked measurements'});continue;}
   const readings=matches.map(o=>Number(o?.value));if(readings.some(v=>!Number.isFinite(v)))return {ok:false,error:`Invalid observation: ${id}`};
   const avg=readings.reduce((a,b)=>a+b,0)/readings.length;
   const pass=Math.abs(avg-expected)<=tolerance;
   if(pass)support++;else contradict++;
   checks.push({id,status:pass?'consistent':'inconsistent',samples:readings.length,expected,mean:avg,tolerance,absoluteError:Math.abs(avg-expected),reason:matches.length<3?'Low sample count; replication recommended':'Check uncertainty, instrumentation, controls and alternative causes'});
 }
 const flags=[];
 if(unknown)flags.push('Unmeasured predictions');
 if(contradict)flags.push('At least one numerical prediction disagrees with observations');
 if(observations.length<3)flags.push('Very limited sample size');
 if(!input.controlDescription)flags.push('No control or baseline described');
 if(!input.independentReplication)flags.push('Independent replication not documented');
 const data={claim:statement,checks,summary:{consistent:support,inconsistent:contradict,unmeasured:unknown},flags,conclusion:contradict?'Model conflicts with some observations':unknown?'Insufficient observations':'Numerically consistent with these observations only',caveat:'Consistency is not causation or proof; a novel physical mechanism requires independent validation'};
 return {ok:true,...data,fingerprint:sha(data)};
}
export function compareResearchModels(input={}){
 const rows=input?.measurements,models=input?.models;
 if(!Array.isArray(rows)||rows.length<5||rows.length>500||!Array.isArray(models)||models.length<2||models.length>15)return {ok:false,error:'Provide 5-500 x/y measurements and 2-15 model predictions'};
 if(rows.some(r=>!Number.isFinite(r?.x)||!Number.isFinite(r?.y)))return {ok:false,error:'Only finite numeric measurements are supported'};
 const scored=[];
 for(const model of models){if(!Array.isArray(model?.predictions)||model.predictions.length!==rows.length||model.predictions.some(v=>!Number.isFinite(v)))return {ok:false,error:'Each model requires a finite prediction for every measurement'};
 const n=rows.length;const residuals=rows.map((r,i)=>r.y-model.predictions[i]);const mse=residuals.reduce((a,b)=>a+b*b,0)/n;const mae=residuals.reduce((a,b)=>a+Math.abs(b),0)/n;
 scored.push({name:normalized(model.name)||'unnamed',mse,rmse:Math.sqrt(mse),mae,assumptions:normalized(model.assumptions),complexity:Number.isInteger(model.parameters)&&model.parameters>=0?model.parameters:null});
 }
 scored.sort((a,b)=>a.rmse-b.rmse);return {ok:true,ranking:scored,bestOnSuppliedData:scored[0].name,limitations:['Predictions are user-supplied; no automatic theory discovery','In-sample fit may overstate performance','Use holdout data, uncertainty analysis and replication'],fingerprint:sha({rows,models})};
}
export function benchmarkGate(report={}){
 const required=['math','physics','research','reasoning','security','integration'];
 const results=required.map(name=>{const r=report[name];return {name,passed:Number.isInteger(r?.passed)?r.passed:0,failed:Number.isInteger(r?.failed)?r.failed:0,independent:r?.independent===true};});
 const blocked=results.filter(r=>r.passed<1||r.failed>0||!r.independent).map(r=>r.name);
 return {ok:true,releaseEligible:blocked.length===0,blocked,results,note:'Self-reported checks cannot establish independent certification; results require independently executed evidence.'};
}
