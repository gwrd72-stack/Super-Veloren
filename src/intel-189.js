import crypto from 'node:crypto';
import {retrieveProvider188} from './provider-188.js';
import {corroborate187,saveIntel187} from './intel-vault-187.js';
const redact=(s)=>String(s||'').replace(/\b(?:[\w.+-]+@[\w.-]+\.[a-z]{2,})\b/gi,'[EMAIL REDACTED]').slice(0,800);
const tokenize=(s)=>new Set(String(s||'').toLowerCase().match(/[a-z0-9]{4,}/g)||[]);
export function rankFindings189({objective,reports=[]}={}){
 if(typeof objective!=='string'||objective.trim().length<5||objective.length>300||!Array.isArray(reports)||reports.length>200)return {ok:false,error:'Invalid objective or reports'};
 const terms=tokenize(objective),results=[],rejected=[];const dedupe=new Set();
 for(const r of reports){
  if(!r||typeof r!=='object'||!['research','vulnerability','exposure','fraud','infrastructure','other'].includes(r.category)||r.rawCredentials||r.stolenData||r.passwords){rejected.push('Invalid or sensitive report');continue;}
  let u;try{u=new URL(r.reference);}catch{rejected.push('Invalid citation');continue;}
  if(u.protocol!=='https:'||u.username||u.password||u.hostname.endsWith('.onion')){rejected.push('Unsupported citation');continue;}
  const title=redact(r.title).slice(0,200),summary=redact(r.summary),providerId=String(r.providerId||'unknown').slice(0,100);
  const textTerms=tokenize(`${title} ${summary}`),matches=[...terms].filter(t=>textTerms.has(t));
  const key=crypto.createHash('sha256').update(`${u.href}|${title.toLowerCase()}`).digest('hex');if(dedupe.has(key))continue;dedupe.add(key);
  results.push({id:key,title,summary,providerId,reference:u.href,category:r.category,matchTerms:matches,score:terms.size?matches.length/terms.size:0,assessment:'unverified-source-report'});
 }
 results.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 return {ok:true,objective:objective.trim(),findings:results,unmatchedTerms:[...terms].filter(t=>!results.some(r=>r.matchTerms.includes(t))),rejected,verification:'Relevance does not establish truth or source independence'};
}
export async function runIntelMission189({objective,limit=25,archive=false}={},deps={}){
 if(typeof objective!=='string'||objective.trim().length<5||objective.length>300||!Number.isInteger(limit)||limit<1||limit>100||typeof archive!=='boolean')return {ok:false,error:'Invalid mission parameters'};
 const provider=await (deps.retrieve||retrieveProvider188)({limit},deps.providerOptions||{});
 if(!provider?.ok)return {ok:false,error:'Authorized intelligence provider unavailable',providerConfigured:false};
 const ranked=rankFindings189({objective,reports:provider.accepted});if(!ranked.ok)return ranked;
 const corroboration=corroborate187({objective,reports:ranked.findings.map(x=>({...x}))});
 const report={ok:true,objective,provider:provider.providerId,findings:ranked.findings,corroboration:{independentProviders:corroboration.independentProviders,status:corroboration.corroboration},unmatchedTerms:ranked.unmatchedTerms,discarded:ranked.rejected.length+(provider.rejected?.length||0),assessment:'Preliminary unverified intelligence; validate primary sources before decisions'};
 if(archive){const save=await (deps.save||saveIntel187)({ok:true,evidence:ranked.findings,objective,assessment:report.assessment});if(!save.ok)return {ok:false,error:'Intelligence retrieved but encrypted archive failed',archiveError:save.error};report.archiveId=save.id;}
 return report;
}
