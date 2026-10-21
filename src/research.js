import { sciencePython } from './python-runtime.js';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const caseFile=path.join(process.cwd(),'data','xfiles-cases.json');
let queue=Promise.resolve();

// Fast, dependency-free descriptive statistics. No Python process or NumPy startup.
function describeNative(req) {
  const v=req.values;
  if (!Array.isArray(v) || v.length<2 || v.length>10000 ||
      v.some(x=>typeof x!== 'number' || !Number.isFinite(x) || Math.abs(x)>1e12)) {
    return {ok:false,error:'Enter between 2 and 10,000 finite numeric measurements'};
  }
  const n=v.length;
  // Welford method reduces cancellation error for variance.
  let mean=0,m2=0;
  for(let i=0;i<n;i++){const delta=v[i]-mean;mean+=delta/(i+1);m2+=delta*(v[i]-mean);}
  const sorted=[...v].sort((a,b)=>a-b);
  const median=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;
  const sampleStd=Math.sqrt(Math.max(0,m2/(n-1)));
  // t critical values for 95% two-sided interval, exact table for df=1..30;
  // large-sample normal approximation for df>30 (not an exact t interval).
  const critical=[0,12.706,4.303,3.182,2.776,2.571,2.447,2.365,2.306,2.262,2.228,2.201,2.179,2.160,2.145,2.131,2.120,2.110,2.101,2.093,2.086,2.080,2.074,2.069,2.064,2.060,2.056,2.052,2.048,2.045,2.042];
  const t=n<=31?critical[n-1]:1.96;
  const margin=t*sampleStd/Math.sqrt(n);
  return {ok:true,operation:'describe',result:{sample_size:n,mean,median,sample_std:sampleStd,minimum:sorted[0],maximum:sorted[n-1],mean_95pct_confidence_interval:[mean-margin,mean+margin],caution:'Confidence interval assumes independent, representative observations. For n > 31 it uses a normal approximation.'}};
}

export async function analyze(req) {
 if(req?.operation==='describe') return describeNative(req);
 const python=sciencePython();
 const allowed=['describe','compare','fit','spectrum','spectral_diagnostics','montecarlo'];
 if(!req||!allowed.includes(req.operation)) return {ok:false,error:'Unsupported operation'};
 if(JSON.stringify(req).length>130000) return {ok:false,error:'Research request too large'};
 return new Promise(resolve=>{
  const child=spawn(python,['src/research_engine.py'],{cwd:process.cwd(),stdio:['pipe','pipe','pipe'],windowsHide:true});
  let output='',stderr='',finished=false;
  const finish=(v)=>{if(!finished){finished=true;clearTimeout(timer);resolve(v);}};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish({ok:false,error:'Research analysis timed out'});},45000);
  child.on('error',e=>finish({ok:false,error:e.message}));
  child.stdout.on('data',b=>{output+=String(b);if(output.length>100000)child.kill('SIGKILL');});
  child.stderr.on('data',b=>{stderr+=String(b).slice(0,3000);if(stderr.length>5000)stderr=stderr.slice(-5000);});
  child.on('close',(code)=>{if(code!==0)console.error('[Research engine] python exit:',code,stderr.slice(-1200));try{finish(JSON.parse(output));}catch{console.error('[Research engine] invalid output:',stderr.slice(-1200));finish({ok:false,error:'Research engine failed; inspect Python dependencies and Render logs'});}});
  child.stdin.end(JSON.stringify(req));
 });
}
export async function getCases(){try{return JSON.parse(await fs.readFile(caseFile,'utf8'));}catch(e){if(e.code==='ENOENT')return [];throw e;}}
function validateText(s,max=2000){if(typeof s!=='string'||!s.trim()||s.length>max)throw new Error('Invalid or oversized text');return s.trim();}
export function createCase(input){return {id:randomUUID(),title:validateText(input.title,160),hypothesis:validateText(input.hypothesis),status:'unverified',createdAt:new Date().toISOString(),evidence:[],tests:[]};}
export function newEvidence(input){
 const kind=input.kind;
 if(!['observation','measurement','document','testimony','counterevidence'].includes(kind))throw new Error('Invalid evidence type');
 return {id:randomUUID(),kind,description:validateText(input.description),source:validateText(input.source,300),recordedAt:new Date().toISOString(),reliability:'unassessed'};
}
export async function mutateCases(fn){
 const result=queue.then(async()=>{const cases=await getCases();const answer=fn(cases);await fs.mkdir(path.dirname(caseFile),{recursive:true});const tmp=caseFile+'.tmp';await fs.writeFile(tmp,JSON.stringify(cases,null,2));await fs.rename(tmp,caseFile);return answer;});
 queue=result.catch(()=>{});return result;
}
