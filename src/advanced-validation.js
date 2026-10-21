import crypto from 'node:crypto';
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
function error(message){return {ok:false,error:message};}
// Holdout scores compare predicted values with NEVER-fitted validation data.
export function validateHoldout(input={}){
 const {rows,models}=input;
 if(!Array.isArray(rows)||rows.length<10||rows.length>2000||!Array.isArray(models)||models.length<2||models.length>12)return error('Require 10-2000 rows and 2-12 models');
 if(rows.some(r=>!finite(r?.actual)||!['train','test'].includes(r?.partition)))return error('Each row needs finite actual and train/test partition');
 const train=rows.filter(r=>r.partition==='train'),test=rows.filter(r=>r.partition==='test');
 if(train.length<5||test.length<5)return error('Require at least five training and five holdout observations');
 if(models.some(m=>!Array.isArray(m?.predictions)||m.predictions.length!==rows.length||m.predictions.some(v=>!finite(v))))return error('Each model must supply finite predictions for all rows');
 const scored=models.map(m=>{
  const stats=part=>{const indices=rows.flatMap((r,i)=>r.partition===part?[i]:[]);const residuals=indices.map(i=>rows[i].actual-m.predictions[i]); const mse=residuals.reduce((s,v)=>s+v*v,0)/residuals.length;return {n:residuals.length,rmse:Math.sqrt(mse),mae:residuals.reduce((s,v)=>s+Math.abs(v),0)/residuals.length,bias:residuals.reduce((s,v)=>s+v,0)/residuals.length};};
  return {name:typeof m.name==='string'?m.name.slice(0,120):'unnamed',train:stats('train'),holdout:stats('test')};
 });
 scored.sort((a,b)=>a.holdout.rmse-b.holdout.rmse);
 return {ok:true,models:scored,bestOnHoldout:scored[0].name,caveats:['Model selection on repeated holdout use causes leakage','User-supplied predictions are not proof of out-of-sample generalization','Confirm partitioning occurred before fitting'],fingerprint:hash({rows,models})};
}
// Deterministic sensitivity analysis with explicit perturbations and finite results.
export function assessSensitivity(input={}){
 const {baseline,variations}=input;
 if(!finite(baseline)||!Array.isArray(variations)||variations.length<2||variations.length>200)return error('Finite baseline and 2-200 variations required');
 if(variations.some(v=>typeof v?.parameter!=='string'||!finite(v?.output)||!finite(v?.delta)||v.delta===0))return error('Each variation needs parameter, nonzero delta, and finite output');
 const out=variations.map(v=>({parameter:v.parameter.slice(0,120),delta:v.delta,output:v.output,absoluteChange:Math.abs(v.output-baseline),slope:(v.output-baseline)/v.delta}));
 if(out.some(v=>!finite(v.slope)||!finite(v.absoluteChange)))return error('Numerical overflow');
 out.sort((a,b)=>Math.abs(b.slope)-Math.abs(a.slope));
 return {ok:true,ranking:out,interpretation:'Local finite-difference sensitivity only; nonlinear/global behavior requires further trials',fingerprint:hash({baseline,variations})};
}
// An evidence matrix that distinguishes hypotheses from unsupported certainty.
export function challengeHypotheses(input={}){
 const {hypotheses,evidence}=input;
 if(!Array.isArray(hypotheses)||hypotheses.length<2||hypotheses.length>15||!Array.isArray(evidence)||evidence.length<1||evidence.length>100)return error('Require 2-15 hypotheses and 1-100 pieces of evidence');
 const ids=hypotheses.map(h=>h?.id);
 if(ids.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,48}$/.test(id))||new Set(ids).size!==ids.length)return error('Unique safe hypothesis IDs required');
 if(evidence.some(e=>typeof e?.source!=='string'||!e.source.trim()||!['observation','independent-replication','simulation','report'].includes(e.type)||!e.assessments||typeof e.assessments!=='object'))return error('Evidence needs provenance, type and assessments');
 const ranked=hypotheses.map(h=>{
  let supporting=0,contradicting=0,unknown=0,independent=0;
  for(const e of evidence){const a=e.assessments[h.id]??'unknown';if(!['supports','contradicts','unknown'].includes(a))return null;
   if(a==='supports'){supporting++;if(e.type==='independent-replication')independent++;}else if(a==='contradicts')contradicting++;else unknown++;}
  return {id:h.id,label:String(h.label??h.id).slice(0,200),supporting,contradicting,unknown,independentReplications:independent,status:contradicting?'contested':independent&&supporting>=2?'corroborated':'unconfirmed'};
 });
 if(ranked.some(x=>x===null))return error('Invalid evidence assessment');
 return {ok:true,hypotheses:ranked,limitations:['Evidence counts are not posterior probabilities','Source independence and measurement validity require separate review','No model is established solely by this assessment'],fingerprint:hash({hypotheses,evidence})};
}
