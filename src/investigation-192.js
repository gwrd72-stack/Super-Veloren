import {unifiedDiscovery} from './unified-discovery-186.js';
import crypto from 'node:crypto';
const stop=new Set(['which','where','about','find','under','using','their','there','these','those','information','research','sources','with','from','what','that','this','and','the','for']);
const keywords=s=>[...new Set((String(s||'').toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(x=>!stop.has(x)))];
const safeUrl=u=>{try{const x=new URL(u);return x.protocol==='https:'&&!x.username&&!x.password&&!/\.(onion)$/i.test(x.hostname)?x:null;}catch{return null}};
const textOf=x=>`${x.title||''} ${x.summary||''}`.toLowerCase();
export function assessMission192(objective, findings=[]){
 const terms=keywords(objective);const valid=[];const seen=new Set();const hosts=new Set();const hits=new Set();let invalid=0,duplicates=0;
 for(const r of findings){const u=safeUrl(r.reference);if(!u){invalid++;continue;}const key=u.origin+u.pathname.replace(/\/$/,'');if(seen.has(key)){duplicates++;continue;}seen.add(key);hosts.add(u.hostname);const text=textOf(r);const matched=terms.filter(t=>text.includes(t));matched.forEach(t=>hits.add(t));valid.push({...r,matchedTerms:matched,objectiveFraction:terms.length?matched.length/terms.length:0});}
 valid.sort((a,b)=>b.objectiveFraction-a.objectiveFraction);
 const relevant=valid.filter(r=>r.matchedTerms.length>0),uncovered=terms.filter(t=>!hits.has(t));
 return {ok:true,accepted:valid.length,relevant:relevant.length,invalid,duplicates,distinctHosts:hosts.size,coverage:terms.length?hits.size/terms.length:0,uncovered,findings:valid,verified:false,limitations:'Keyword coverage, host diversity and URLs do not verify truth, source independence or retrieval accuracy.'};
}
export function planFollowup192(objective, uncovered=[], attempted=[]){
 const key=keywords(objective), missing=keywords(uncovered.join(' '));
 const candidates=[
  [ ...missing.slice(0,3),'technical report primary source'].join(' '),
  [ ...key.slice(0,4),'experimental data measurement'].join(' '),
  [ ...missing.slice(0,3),'peer reviewed publication'].join(' '),
  [ ...key.slice(0,4),'patent technical documentation'].join(' ')
 ].map(q=>q.trim()).filter(q=>q.length>=8&&q.length<=230);
 const seen=new Set(attempted.map(q=>q.toLowerCase()));return candidates.find(q=>!seen.has(q.toLowerCase()))||null;
}
export async function investigate192(input,{search,rounds=3}={}){
 const objective=String(input?.objective||'').trim();if(objective.length<8||objective.length>500)return {ok:false,error:'Objective must be 8-500 characters'};
 if(typeof search!=='function')return {ok:false,error:'Search adapter unavailable'};
 if(!Number.isInteger(rounds)||rounds<1||rounds>4)return {ok:false,error:'Rounds must be 1-4'};
 const allowed=['wikipedia','crossref','brave'];const providers=input.providers||['wikipedia','crossref'];
 if(!Array.isArray(providers)||!providers.length||providers.length>3||providers.some(p=>!allowed.includes(p)))return {ok:false,error:'Unsupported source'};
 const resultMap=new Map(),history=[];let query=objective;
 for(let i=0;i<rounds;i++){
  const response=await search({objective:query,project:input.project||'General',providers});
  const docs=response?.ok&&Array.isArray(response.results)?response.results:[];
  let added=0;for(const doc of docs.slice(0,100)){const u=safeUrl(doc.reference);if(!u)continue;const k=u.origin+u.pathname.replace(/\/$/,'');if(!resultMap.has(k)){resultMap.set(k,{title:String(doc.title||'').slice(0,250),summary:String(doc.summary||'').slice(0,1200),reference:u.href,origin:String(doc.origin||'unknown').slice(0,100)});added++;}}
  const assessment=assessMission192(objective,[...resultMap.values()]);history.push({query,round:i+1,newUnique:added,coverage:assessment.coverage,providerErrors:response?.errors||[],error:response?.ok?null:String(response?.error||'Source failed')});
  if(assessment.coverage===1||i===rounds-1)break;
  const next=planFollowup192(objective,assessment.uncovered,history.map(h=>h.query));if(!next)break;query=next;
 }
 const assessment=assessMission192(objective,[...resultMap.values()]);return {ok:true,objective,providers,history,...assessment,findings:assessment.findings.slice(0,75),digest:crypto.createHash('sha256').update(JSON.stringify({objective,history,findings:assessment.findings})).digest('hex'),evidenceStatus:'UNVERIFIED',pending:assessment.uncovered.map(t=>`Find independent primary evidence for ${t}`)};
}
