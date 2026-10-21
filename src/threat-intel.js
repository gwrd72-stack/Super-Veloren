import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const file=path.join(process.cwd(),'data','threat-intel.json');
let lock=Promise.resolve();
const serial=fn=>{const task=lock.then(fn);lock=task.catch(()=>{});return task;};
const clean=(v,n=500)=>String(v??'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,n);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const blank=()=>({providers:[],reports:[],schemaVersion:1});
async function load(){try{return {...blank(),...JSON.parse(await fs.readFile(file,'utf8'))};}catch(e){if(e.code==='ENOENT')return blank();throw e;}}
async function save(v){await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID();await fs.writeFile(temp,JSON.stringify(v,null,2),{mode:0o600});await fs.rename(temp,file);}
// Drop credential material and tokens rather than persist them in the intelligence vault.
export function redact(v){let s=clean(v,4000);s=s.replace(/\b(?:password|passwd|pwd|api[_ -]?key|secret|bearer|authorization|access[_ -]?token)\s*[:=]\s*[^\s,;]+/gi,'[REDACTED CREDENTIAL]');s=s.replace(/\bbearer\s+[A-Za-z0-9._-]{6,}/gi,'[REDACTED CREDENTIAL]');s=s.replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,})\b/g,'[REDACTED TOKEN]');return s;}
const categories=new Set(['credential-exposure','ransomware','vulnerability','fraud','infrastructure','research','other']);
const severities=new Set(['critical','high','medium','low','informational','unknown']);
const assessments=new Set(['unverified','single-provider','cross-source','analyst-confirmed']);
export function validateReport(input,providers){
 if(!input||typeof input!=='object'||Array.isArray(input))return {ok:false,error:'Expected report object'};
 const provider=providers.find(p=>p.id===input.providerId&&p.enabled);if(!provider)return {ok:false,error:'Approved enabled provider required'};
 if(input.authorized!==true)return {ok:false,error:'Explicit authorized intake required'};
 const title=redact(input.title).slice(0,200),summary=redact(input.summary).slice(0,2200),category=clean(input.category,50),severity=clean(input.severity,30),assessment=clean(input.assessment,30)||'unverified';
 if(!title||!summary||!categories.has(category)||!severities.has(severity)||!assessments.has(assessment))return {ok:false,error:'Title, summary, category, severity and assessment required'};
 if(input.rawCredentials||input.credentialDump||input.stolenData||input.passwords)return {ok:false,error:'Raw credentials and stolen dumps must not be ingested'};
 const url=clean(input.reference,700);if(url){try{const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.hostname.endsWith('.onion'))return {ok:false,error:'Only public HTTPS references allowed'};}catch{return {ok:false,error:'Reference must be public HTTPS URL'};}}
 const occurredAt=clean(input.occurredAt,40);if(occurredAt&&(!Number.isFinite(Date.parse(occurredAt))))return {ok:false,error:'Invalid occurrence date'};
 const indicators=Array.isArray(input.indicators)?input.indicators.slice(0,30).filter(i=>i&&typeof i==='object').map(i=>({type:clean(i.type,25),value:redact(i.value).slice(0,180)})).filter(i=>['domain','cve','sha256','ip','organization','product'].includes(i.type)&&i.value&&!/\[REDACTED/.test(i.value)):[];
 const stableKey=clean(input.externalId,250)||sha(title+'|'+summary+'|'+(occurredAt||''));
 return {ok:true,report:{id:sha(provider.id+'|'+stableKey),providerId:provider.id,providerName:provider.name,title,summary,category,severity,assessment,reference:url||null,occurredAt:occurredAt||null,collectedAt:new Date().toISOString(),indicators,status:'new',flags:['Third-party report; not independent proof'],rawEvidenceStored:false}};
}
export async function addProvider(input){const name=clean(input?.name,120),scope=clean(input?.scope,350),sourceType=clean(input?.sourceType,60);if(!name||!scope||!['licensed-threat-feed','user-authorized-analyst','public-security-advisory'].includes(sourceType))return {ok:false,error:'Name, scope, approved source type required'};
 return serial(async()=>{const db=await load();if(db.providers.length>=50)return {ok:false,error:'Provider capacity reached'};if(db.providers.some(p=>p.name.toLowerCase()===name.toLowerCase()))return {ok:false,error:'Duplicate provider'};const p={id:crypto.randomUUID(),name,scope,sourceType,enabled:true,createdAt:new Date().toISOString()};db.providers.push(p);await save(db);return {ok:true,provider:p};});}
export async function disableProvider(id){return serial(async()=>{const db=await load();const p=db.providers.find(x=>x.id===id);if(!p)return {ok:false,error:'Unknown provider'};p.enabled=false;await save(db);return {ok:true};});}
export async function ingestThreatReport(input){return serial(async()=>{const db=await load(),v=validateReport(input,db.providers);if(!v.ok)return v;if(db.reports.some(r=>r.id===v.report.id))return {ok:true,duplicate:true,id:v.report.id};db.reports.push(v.report);db.reports=db.reports.slice(-2000);await save(db);return {ok:true,report:v.report};});}
export function triageReports(reports){const weight={critical:5,high:4,medium:3,low:2,informational:1,unknown:0};return reports.map(r=>({id:r.id,title:r.title,category:r.category,severity:r.severity,assessment:r.assessment,providerName:r.providerName,reference:r.reference,occurredAt:r.occurredAt,collectedAt:r.collectedAt,indicators:r.indicators,score:Math.min(10,weight[r.severity]*1.4+(r.assessment==='cross-source'?2:r.assessment==='analyst-confirmed'?2.5:0)),caveat:'Severity is provider-reported; no independent confirmation implied'})).sort((a,b)=>b.score-a.score||b.collectedAt.localeCompare(a.collectedAt));}
export async function threatStatus(){const db=await load();return {ok:true,providers:db.providers,reports:db.reports.slice(-100).reverse().map(r=>({...r,summary:r.summary})),triage:triageReports(db.reports).slice(0,50),caveat:'No direct .onion crawling; only approved provider reports and public advisory material.'};}
