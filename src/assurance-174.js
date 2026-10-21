import crypto from 'node:crypto';
const finite = x => typeof x==='number' && Number.isFinite(x);
const sha = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail = error => ({ok:false,error});
export function assessPredictions(input={}) {
 const observed=input.observed,predicted=input.predicted;
 if(!Array.isArray(observed)||!Array.isArray(predicted)||observed.length!==predicted.length||observed.length<5||observed.length>5000||![...observed,...predicted].every(finite))return fail('Equal numeric observed/predicted arrays with 5-5000 points required');
 const residuals=observed.map((o,i)=>o-predicted[i]);
 const n=observed.length, mae=residuals.reduce((s,x)=>s+Math.abs(x),0)/n, rmse=Math.sqrt(residuals.reduce((s,x)=>s+x*x,0)/n);
 const mean=observed.reduce((s,x)=>s+x,0)/n, tot=observed.reduce((s,x)=>s+(x-mean)**2,0);
 const r2=tot>0?1-residuals.reduce((s,x)=>s+x*x,0)/tot:null;
 const bias=residuals.reduce((s,x)=>s+x,0)/n;
 const bands=input.intervals;
 let coverage=null,width=null;
 if(bands!==undefined){if(!Array.isArray(bands)||bands.length!==n||!bands.every(b=>Array.isArray(b)&&b.length===2&&b.every(finite)&&b[0]<=b[1]))return fail('intervals must be [lower,upper] pairs of the same length');
 coverage=bands.filter((b,i)=>b[0]<=observed[i]&&observed[i]<=b[1]).length/n;
 width=bands.reduce((s,b)=>s+b[1]-b[0],0)/n;}
 return {ok:true,n,mae,rmse,r2,bias,intervalCoverage:coverage,meanIntervalWidth:width,benchmarkType:'supplied observations versus supplied predictions',warning:'This does not prove observations are independent, held out or authentic; evidence provenance must be validated.',fingerprint:sha({observed,predicted,bands})};
}
const required=['mathematics','physics','frontier','reasoning','experimental_verification','reconnaissance','targeted_retrieval','dark_web_intel','autonomy','memory','master_authority','security','integration'];
export function readinessGate(input={}){
 const results=input.results;
 if(!Array.isArray(results))return fail('results array required');
 const report=[];
 for(const category of required){const matches=results.filter(x=>x&&x.category===category);const valid=matches.filter(x=>Number.isInteger(x.passed)&&Number.isInteger(x.total)&&x.total>=20&&x.passed>=0&&x.passed<=x.total&&x.independent===true&&typeof x.runId==='string'&&x.runId.length>=8);
 const best=valid.sort((a,b)=>b.passed/b.total-a.passed/a.total)[0];report.push({category,measured:!!best,score:best?best.passed/best.total:null,passed:best?.passed??null,total:best?.total??null,meets90:!!best&&best.passed/best.total>=.9});}
 const all=report.every(x=>x.meets90);return {ok:true,readyForNine:all,categories:report,measured:report.filter(x=>x.measured).length,passed:report.filter(x=>x.meets90).length,requires:'Each category needs an independently sourced run of at least 20 graded cases; supplied claims are not themselves independently verified.',fingerprint:sha(report)};
}
export function evidenceGate(input={}){
 const records=input.records;
 if(!Array.isArray(records)||records.length>500||records.length===0)return fail('1-500 evidence records required');
 const assessed=records.map((r,i)=>{const source=typeof r?.source==='string'&&r.source.trim().length>4;const method=typeof r?.method==='string'&&r.method.trim().length>6;const measured=finite(r?.value)&&typeof r?.unit==='string'&&r.unit.trim().length>0;const independent=r?.independent===true;const controls=r?.control===true;return {index:i,source,method,measured,independent,controls,qualified:source&&method&&measured&&independent&&controls};});
 return {ok:true,total:records.length,qualified:assessed.filter(x=>x.qualified).length,assessed,warning:'Checks completeness only, not whether claims or source identities are true.'};
}
export const assuranceCategories=[...required];
