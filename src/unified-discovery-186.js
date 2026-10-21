import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {liveSearch} from './live-retrieval.js';
import {planTarget} from './target-retrieval.js';
import {corroborate} from './intelligence-183.js';
const clean=(x,n=300)=>typeof x==='string'?x.trim().slice(0,n):'';
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const word=x=>(clean(x,2000).toLowerCase().match(/[a-z0-9]{4,}/g)||[]);
const STOP=new Set(['about','which','their','there','these','those','find','from','with','where','what','that','this','have','your','could','should','would','research','information','sources']);
const terms=x=>[...new Set(word(x).filter(t=>!STOP.has(t)))];
const validLink=u=>{try{let x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password;}catch{return false;}};
function crosscheck(results,objective){
 const termSet=terms(objective), found=new Set();
 const ranked=results.map(r=>{
  const hits=termSet.filter(t=>(r.title+' '+r.summary).toLowerCase().includes(t));hits.forEach(t=>found.add(t));
  const overlap=hits.length/Math.max(1,termSet.length);
  return {...r,matchedTerms:hits,relevance:Number(overlap.toFixed(3)),assessment:'unverified-research-lead'};
 }).sort((a,b)=>b.relevance-a.relevance||a.title.localeCompare(b.title));
 return {ranked,uncovered:termSet.filter(t=>!found.has(t)),coverage:termSet.length?found.size/termSet.length:0};
}
export async function unifiedDiscovery(input,{search=liveSearch,persist=false,storage=path.join(process.cwd(),'data','v186-investigations')}={}){
 const plan=planTarget(input||{});if(!plan.ok)return plan;
 const providers=input.providers??['wikipedia','crossref'];
 if(!Array.isArray(providers)||providers.length<1||providers.length>3||providers.some(x=>!['wikipedia','crossref','brave'].includes(x)))return {ok:false,error:'Unsupported provider'};
 const maxRounds=Number(input.rounds??2);
 if(!Number.isInteger(maxRounds)||maxRounds<1||maxRounds>3)return {ok:false,error:'Rounds must be 1-3'};
 const all=new Map(),rounds=[];let query=plan.objective;const tried=new Set();
 for(let i=0;i<maxRounds;i++){
  if(tried.has(query.toLowerCase()))break;tried.add(query.toLowerCase());
  const result=await search({objective:query,project:plan.project,providers});
  if(!result?.ok){rounds.push({round:i+1,query,error:clean(result?.error,200)||'Search unsuccessful'});break;}
  const records=Array.isArray(result.results)?result.results:[];let added=0;
  for(const r of records.slice(0,100)){
   if(!r||!validLink(r.reference)||!clean(r.title))continue;
   const key=r.reference.toLowerCase().replace(/#.*$/,'');
   if(!all.has(key)){all.set(key,{title:clean(r.title,250),summary:clean(r.summary,1300),reference:r.reference,origin:clean(r.origin,100)||'unknown',collectedAt:clean(r.collectedAt,50),query});added++;}
  }
  const check=crosscheck([...all.values()],plan.objective);
  rounds.push({round:i+1,query,retrieved:records.length,newUnique:added,coverage:Number(check.coverage.toFixed(3)),providerErrors:result.errors||[]});
  if(check.coverage>=0.95||added===0||i===maxRounds-1)break;
  // Search for the least-covered concepts, but preserve the user's original objective.
  const focus=check.uncovered.slice(0,3).join(' ');
  query=clean(`${plan.objective.slice(0,180)} ${focus}`,230);
 }
 const evidence=crosscheck([...all.values()],plan.objective);
 const provenance=corroborate(evidence.ranked.slice(0,100).map((r,i)=>({...r,id:String(i)})));
 const report={ok:true,id:crypto.randomUUID(),objective:plan.objective,project:plan.project,createdAt:new Date().toISOString(),rounds,uniqueSources:all.size,coverage:Number(evidence.coverage.toFixed(3)),uncoveredTerms:evidence.uncovered,findings:evidence.ranked.slice(0,45),corroboration:provenance,followups:evidence.uncovered.slice(0,6).map(t=>`Seek primary evidence on ${t}`),limitations:'Search-provider summaries are unverified. Similar reports are not independent proof. Only approved public providers; no hidden-service collection.'};
 report.digest=hash({objective:report.objective,rounds:report.rounds,findings:report.findings});
 if(persist){await fs.mkdir(storage,{recursive:true,mode:0o700});const dest=path.join(storage,report.id+'.json');await fs.writeFile(dest,JSON.stringify(report,null,2),{flag:'wx',mode:0o600});}
 return report;
}
