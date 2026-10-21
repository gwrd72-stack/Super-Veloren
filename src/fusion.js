import crypto from 'node:crypto';
import {status as watchStatus} from './watch.js';
const safe=(s,n=200)=>String(s??'').slice(0,n).trim();
const tokens=s=>new Set(safe(s,10000).toLowerCase().match(/[a-z0-9]{4,}/g)||[]);
const overlap=(a,b)=>{const ta=tokens(a),tb=tokens(b);if(!ta.size||!tb.size)return 0;let n=0;for(const t of ta)if(tb.has(t))n++;return n/Math.sqrt(ta.size*tb.size);};
export function fuseFindings(findings,projects=[],options={}){
 const limit=Math.max(1,Math.min(100,Number(options.limit)||30));
 if(!Array.isArray(findings)||!Array.isArray(projects))return {ok:false,error:'Arrays required'};
 const cleanProjects=projects.slice(0,30).filter(p=>p&&typeof p==='object').map(p=>({name:safe(p.name,100),keywords:Array.isArray(p.keywords)?p.keywords.slice(0,30).map(k=>safe(k,90)):[]})).filter(p=>p.name);
 const items=findings.slice(-1000).filter(f=>f&&f.id&&f.title).map(f=>{
  const text=safe(f.title,300)+' '+safe(f.summary,3500);
  const matched=cleanProjects.map(p=>({name:p.name,score:p.keywords.reduce((m,k)=>m+(k&&text.toLowerCase().includes(k.toLowerCase())?1:0),0)})).filter(p=>p.score>0).sort((a,b)=>b.score-a.score);
  const corroborated=Number.isInteger(f.corroborationCount)?Math.min(3,Math.max(0,f.corroborationCount)):0;
  const ageHours=Math.max(0,(Date.now()-Date.parse(f.collectedAt||''))/36e5);
  const recent=Number.isFinite(ageHours)&&ageHours<72?2:0;
  const riskWords=/critical|exploit|outage|breach|warning|urgent/i.test(text)?2:0;
  const priority=Math.min(10,Math.max(0,matched.length?3:0)+Math.min(3,matched.reduce((x,m)=>x+m.score,0))+recent+riskWords+corroborated);
  return {id:safe(f.id,128),title:safe(f.title,200),summary:safe(f.summary,1600),reference:safe(f.reference,700),origin:safe(f.origin,80),collectedAt:safe(f.collectedAt,40),priority,projects:matched,confidence:f.confidence||'unverified',evidenceStatus:corroborated?'reported corroboration, independently assess sources':'unverified lead',reason:[matched.length?'project keyword overlap':'no configured project match',recent?'recently collected':'older or unknown collection date',riskWords?'risk terminology detected':null].filter(Boolean)};
 });
 items.sort((a,b)=>b.priority-a.priority||b.collectedAt.localeCompare(a.collectedAt));
 const clusters=[];
 for(const item of items.slice(0,250)){
  const cluster=clusters.find(c=>overlap(c.topic,item.title+' '+item.summary)>0.40);
  if(cluster){cluster.ids.push(item.id);cluster.sources.add(item.origin);cluster.priority=Math.max(cluster.priority,item.priority);}else clusters.push({topic:item.title+' '+item.summary,headline:item.title,ids:[item.id],sources:new Set([item.origin]),priority:item.priority});
 }
 const groups=clusters.map(c=>({headline:c.headline,ids:c.ids,reportedOriginCount:c.sources.size,priority:c.priority})).sort((a,b)=>b.priority-a.priority);
 return {ok:true,total:items.length,projects:cleanProjects.map(p=>p.name),findings:items.slice(0,limit),clusters:groups.slice(0,limit),caveat:'Priority is heuristic. Keyword overlap and distinct origins do not prove truth or independent corroboration.'};
}
export async function intelligenceBrief(projects=[],options={}){const s=await watchStatus();return {...fuseFindings(s.findings,projects,options),lastRun:s.lastRun,sourceCount:s.sources.length};}
export function compareSnapshots(older,newer){if(!Array.isArray(older)||!Array.isArray(newer))return {ok:false,error:'Arrays required'};const old=new Map(older.filter(x=>x?.id).map(x=>[x.id,x]));const now=new Map(newer.filter(x=>x?.id).map(x=>[x.id,x]));return {ok:true,added:[...now.keys()].filter(k=>!old.has(k)).slice(0,100),removed:[...old.keys()].filter(k=>!now.has(k)).slice(0,100),changed:[...now.keys()].filter(k=>old.has(k)&&crypto.createHash('sha256').update(JSON.stringify(old.get(k))).digest('hex')!==crypto.createHash('sha256').update(JSON.stringify(now.get(k))).digest('hex')).slice(0,100)};}
