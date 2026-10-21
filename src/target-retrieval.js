import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {status as feedStatus} from './watch.js';
import {threatStatus} from './threat-intel.js';
const file=path.join(process.cwd(),'data','target-retrieval.json');
const MAX=100;let queue=Promise.resolve();
const serial=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
const text=(value,n=1000)=>typeof value==='string'?value.trim().slice(0,n):'';
const words=value=>[...new Set((text(value,12000).toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g)||[]).filter(w=>!STOP.has(w)))];
const STOP=new Set('the and for from with that this what where when which were have find about into their them then here there your more less than does how are was not you but all any use using can'.split(' '));
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const blank=()=>({missions:[]});
async function load(){try{return {...blank(),...JSON.parse(await fs.readFile(file,'utf8'))};}catch(e){if(e.code==='ENOENT')return blank();throw e;}}
async function save(db){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+crypto.randomUUID();await fs.writeFile(tmp,JSON.stringify(db,null,2),{mode:0o600});await fs.rename(tmp,file);}
export function planTarget(request){const objective=text(request?.objective,500),project=text(request?.project,100),terms=words(objective+' '+project).slice(0,24);
 if(objective.length<8||terms.length===0)return {ok:false,error:'A specific search objective of at least eight characters is required'};
 const exclusions=Array.isArray(request?.exclude)?request.exclude.slice(0,10).map(x=>text(x,70)).filter(Boolean):[];
 const aliases=[...new Set([...terms,...(Array.isArray(request?.keywords)?request.keywords.slice(0,12).flatMap(words):[])])].slice(0,32);
 const queries=[objective,aliases.slice(0,5).join(' '),aliases.slice(-5).join(' ')].filter(Boolean);
 return {ok:true,objective,project,keywords:aliases,exclude:exclusions,queries:[...new Set(queries)],sources:['approved-public-feeds','approved-threat-reports'],limitations:'Plans target authorized stored findings only; no live web search or Tor access is implied',reviewRequired:true};
}
export function rankEvidence(plan,documents){if(!plan?.ok||!Array.isArray(documents))return {ok:false,error:'Valid plan and documents array required'};
 const out=[];for(const d of documents.slice(0,1500)){if(!d||typeof d!=='object')continue;
 const title=text(d.title,250),summary=text(d.summary,2500),content=(title+' '+summary).toLowerCase();if(!title)continue;
 if(plan.exclude.some(x=>content.includes(x.toLowerCase())))continue;
 const hit=plan.keywords.filter(w=>content.includes(w));if(!hit.length)continue;
 const relevance=hit.length/Math.max(1,plan.keywords.length);
 const origin=text(d.origin||d.providerName,100),ref=text(d.reference,700),collectedAt=text(d.collectedAt,40);
 const recency=Number.isFinite(Date.parse(collectedAt))?Math.max(0,1-(Date.now()-Date.parse(collectedAt))/(1000*3600*24*180)):0;
 const score=Math.round(100*(.85*relevance+.15*recency));
 out.push({id:text(d.id,160)||digest(title+'|'+ref),title,summary,reference:/^https:\/\//i.test(ref)?ref:null,origin,score,matchedKeywords:hit,collectedAt,assessment:text(d.assessment||d.confidence,45)||'unverified',caveat:'A matched source is a research lead, not a verified conclusion'});
 }
 out.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
 const seen=new Set();const ranked=[];
 for(const item of out){const key=(item.reference||item.title.toLowerCase());if(seen.has(key))continue;seen.add(key);ranked.push(item);if(ranked.length>=100)break;}
 const coverage=[...new Set(ranked.flatMap(x=>x.matchedKeywords))];
 return {ok:true,total:ranked.length,results:ranked,uncoveredKeywords:plan.keywords.filter(x=>!coverage.includes(x)),nextSteps:plan.keywords.filter(x=>!coverage.includes(x)).slice(0,8).map(x=>`Seek independent authorized source evidence for: ${x}`),warning:'Coverage, keyword overlap and ranking do not establish source credibility or factual truth.'};
}
export async function executeTarget(input){const plan=planTarget(input);if(!plan.ok)return plan;
 const [feed,threat]=await Promise.all([feedStatus(),threatStatus()]);
 const docs=[...(feed.findings||[]),...(threat.reports||[])];const ranked=rankEvidence(plan,docs);
 return serial(async()=>{const db=await load();const id=crypto.randomUUID();const mission={id,createdAt:new Date().toISOString(),plan,report:ranked,sourceSnapshot:{feedFindings:feed.findings?.length||0,threatReports:threat.reports?.length||0},status:'completed-local-search'};
 db.missions.push(mission);db.missions=db.missions.slice(-MAX);await save(db);
 return {ok:true,mission,disclaimer:'This execution searches locally saved authorized records. No external search provider was queried.'};});
}
export async function getTargetMissions(){const db=await load();return {ok:true,missions:db.missions.map(({id,createdAt,plan,report,status})=>({id,createdAt,objective:plan.objective,status,matched:report.total})).reverse()};}
export async function getTargetMission(id){const db=await load();const mission=db.missions.find(x=>x.id===id);return mission?{ok:true,mission}:{ok:false,error:'Mission not found'};}
