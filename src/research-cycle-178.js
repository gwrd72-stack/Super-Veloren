import crypto from 'node:crypto';
import {assessPredictions,evidenceGate} from './assurance-174.js';
import {signalDiagnostics,oscillatorDiagnostics} from './capability-177.js';
import {validateHoldout} from './advanced-validation.js';

const sha = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const accepted = new Set(['prediction','evidence','signal','oscillator','holdout']);
const funcs = {prediction:assessPredictions,evidence:evidenceGate,signal:signalDiagnostics,oscillator:oscillatorDiagnostics,holdout:validateHoldout};
const boundedObject=x=>x && typeof x==='object'&&!Array.isArray(x)&&JSON.stringify(x).length<=40000;

// Plans are built only from explicitly provided observations and approved methods.
// Claims of novelty are never automatically accepted as fact.
export function researchCycle178(input={}) {
 const objective=typeof input.objective==='string'?input.objective.trim().slice(0,700):'';
 if(objective.length<12)return {ok:false,error:'Provide an objective of at least 12 characters'};
 const tasks=input.tasks;
 if(!Array.isArray(tasks)||!tasks.length||tasks.length>8)return {ok:false,error:'Provide 1-8 explicitly bounded analytical tasks'};
 const findings=[];
 for(let i=0;i<tasks.length;i++){
  const item=tasks[i];
  if(!item || !accepted.has(item.method)||!boundedObject(item.data))return {ok:false,error:`Task ${i+1}: unsupported method or invalid inputs`};
  let result;
  try { result=funcs[item.method](item.data); }
  catch(_){ result={ok:false,error:'Analysis failed; inspect input and model assumptions'}; }
  findings.push({step:i+1,method:item.method,ok:result?.ok===true,result});
 }
 const success=findings.filter(f=>f.ok).length;
 const failed=findings.filter(f=>!f.ok).length;
 const contradictions=findings.filter(f=>!f.ok).map(f=>({step:f.step,issue:f.result?.error||'Analysis not validated'}));
 return {ok:true,objective,findings,summary:{passed:success,failed,conclusion:failed?'inconclusive—investigate failed checks':'calculations completed—not independently demonstrated',contradictions},fingerprint:sha({objective,tasks}),nextActions:['Obtain independent measurements','Run a holdout test on previously unseen data','Repeat with independent instruments or methods'],authority:'Master-approved calculations only; no network access, code execution, or external actions'};
}
export function scoreReproducibility178(input={}) {
 const runs=input.runs;
 if(!Array.isArray(runs)||runs.length<2||runs.length>50)return {ok:false,error:'Provide 2-50 repeated numeric measurements'};
 if(!runs.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e15))return {ok:false,error:'Measurements must be finite numbers'};
 const n=runs.length, mean=runs.reduce((a,b)=>a+b,0)/n;
 const variance=runs.reduce((a,b)=>a+(b-mean)**2,0)/(n-1);
 const sd=Math.sqrt(variance),sem=sd/Math.sqrt(n);
 const relativeSpread=mean===0?null:sd/Math.abs(mean);
 return {ok:true,n,mean,standardDeviation:sd,standardError:sem,relativeSpread,warning:'Repeated measurements alone cannot establish causality, novelty, or absence of systematic error',fingerprint:sha(runs)};
}
