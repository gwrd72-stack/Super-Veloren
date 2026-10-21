import crypto from 'node:crypto';
import {reasonWithModel} from './intelligence.js';
import {searchResearch} from './research-176.js';
import {advancedScience} from './advanced-engine.js';
import {signalDiagnostics,oscillatorDiagnostics} from './capability-177.js';
import {assessPredictions} from './assurance-174.js';
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const allowed=['science','signal','oscillator','predictions'];
const isObj=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const str=(v,n=2000)=>typeof v==='string'?v.trim().slice(0,n):'';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function validate(input){if(!isObj(input)||str(input.objective).length<10)return 'Objective must have at least ten characters';if(!Array.isArray(input.hypotheses)||input.hypotheses.length<2||input.hypotheses.length>8)return 'Two to eight rival hypotheses required';if(!input.hypotheses.every(h=>isObj(h)&&str(h.claim,1000).length>=6&&str(h.prediction,1000).length>=4&&str(h.falsifier,1000).length>=4))return 'Each hypothesis requires claim, prediction, falsifier';return null;}
export function challenge181(input={}){
 const error=validate(input);if(error)return {ok:false,error};
 const h=input.hypotheses.map((x,i)=>({id:i+1,claim:str(x.claim,1000),prediction:str(x.prediction,1000),falsifier:str(x.falsifier,1000),observations:Array.isArray(x.observations)?x.observations.slice(0,20).map(s=>str(s,500)):[],contradictions:Array.isArray(x.contradictions)?x.contradictions.slice(0,20).map(s=>str(s,500)):[]}));
 const sorted=h.map(v=>({...v,unresolved:v.observations.length===0||v.contradictions.length>0,score:v.observations.length-v.contradictions.length})).sort((a,b)=>b.score-a.score);
 return {ok:true,objective:str(input.objective),rivals:sorted,questions:['Which measurement discriminates the rival predictions?','Are there simpler conventional alternatives?','Which control or instrument calibration might explain the observation?'],status:'hypotheses not confirmed',fingerprint:digest({objective:str(input.objective),h})};
}
export function discriminate181(input={}){
 const candidates=input.candidates, tests=input.tests;
 if(!Array.isArray(candidates)||candidates.length<2||candidates.length>8||!Array.isArray(tests)||tests.length<1||tests.length>20)return {ok:false,error:'Provide 2–8 candidates and 1–20 possible experiments'};
 if(!candidates.every(c=>isObj(c)&&str(c.id,80)&&tests.every(t=>finite(c.predictions?.[t.id]))))return {ok:false,error:'Every hypothesis must supply a finite predicted measurement for every test'};
 if(!tests.every(t=>isObj(t)&&str(t.id,80)&&finite(t.cost)&&t.cost>0&&finite(t.uncertainty)&&t.uncertainty>0))return {ok:false,error:'Every test requires id, positive cost, and positive measurement uncertainty'};
 const ranked=tests.map(t=>{const values=candidates.map(c=>c.predictions[t.id]);let distance=0,pairs=0;for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++){distance+=Math.abs(values[i]-values[j]);pairs++;}const discrimination=(distance/pairs)/t.uncertainty;return {testId:t.id,discrimination:Number(discrimination.toFixed(6)),cost:t.cost,utility:Number((discrimination/t.cost).toFixed(6)),limit:'Heuristic, not calibrated information gain'};}).sort((a,b)=>b.utility-a.utility);
 return {ok:true,ranked,preferred:ranked[0],caveat:'Assumes comparable predicted units and correctly estimated measurement uncertainties; no empirical model validation.',fingerprint:digest({candidates,tests})};
}
export function selectTools181(input={}){
 const observations=input.observations;if(!isObj(observations))return {ok:false,error:'Supply typed measured observations'};
 const suggestions=[];
 if(Array.isArray(observations.samples)&&finite(observations.sampleRate))suggestions.push({tool:'signal',reason:'Time series with known sample rate',args:{samples:observations.samples,sampleRate:observations.sampleRate}});
 if(Array.isArray(observations.observed)&&Array.isArray(observations.predicted))suggestions.push({tool:'predictions',reason:'Paired observed and predicted values',args:{observed:observations.observed,predicted:observations.predicted}});
 if(isObj(observations.oscillator))suggestions.push({tool:'oscillator',reason:'Oscillator parameters supplied',args:observations.oscillator});
 if(isObj(observations.science))suggestions.push({tool:'science',reason:'Numerical science operation explicitly supplied',args:observations.science});
 if(!suggestions.length)return {ok:true,suggestions:[],requires:['Measurements, expected predictions, or numerical model parameters'],note:'No measurements fabricated'};
 if(suggestions.length>4||JSON.stringify(suggestions).length>40000)return {ok:false,error:'Input exceeds controlled analysis limits'};
 return {ok:true,suggestions,planHash:digest(suggestions),autoExecuted:false,approvedTools:allowed};
}
export async function executeTools181(input={}){
 const selection=selectTools181(input);if(!selection.ok||!selection.suggestions?.length)return {ok:false,error:selection.error||'No executable measurements'};
 if(input.approved!==true||input.planHash!==selection.planHash)return {ok:false,error:'Exact plan hash and explicit Master approval required',planHash:selection.planHash};
 const results=[];for(const step of selection.suggestions){try{let answer;if(step.tool==='science')answer=await advancedScience(step.args);else if(step.tool==='signal')answer=signalDiagnostics(step.args);else if(step.tool==='oscillator')answer=oscillatorDiagnostics(step.args);else answer=assessPredictions(step.args);results.push({tool:step.tool,ok:answer?.ok===true,result:answer});}catch(e){results.push({tool:step.tool,ok:false,error:'Controlled computation failed'});}}
 return {ok:true,planHash:selection.planHash,results,failures:results.filter(r=>!r.ok).length,limitations:['Calculations are not evidence of a novel physical mechanism','No autonomous external actions'],executedWithMasterApproval:true};
}
export async function frontierProposal181(input={}){
 const objective=str(input.objective,2500);if(objective.length<10)return {ok:false,error:'Objective required'};
 const recall=await searchResearch({query:str(input.memoryQuery||objective.split(' ').slice(0,3).join(' '),180)});
 const model=await reasonWithModel({problem:objective,observations:JSON.stringify({measurements:input.measurements||null,priorResearch:recall.ok?recall.hits.slice(0,3):[]}).slice(0,2800),constraints:'Return rival hypotheses, each with a falsifiable prediction, confounder, alternative explanation, and experimental discriminator. Clearly flag speculation, do not fabricate data. No actions; no claims of discovery.'});
 return {ok:model.ok,model,priorRecordMatches:recall.ok?recall.hits.length:0,requiresMasterReview:true,autoExecuted:false};
}
