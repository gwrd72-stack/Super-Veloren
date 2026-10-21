import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.join(process.cwd(),'data');
const file=path.join(root,'recon-cases.json');
const categories=new Set(['public-record','public-article','public-research','authorized-sensor','user-provided']);
const allowedPurposes=new Set(['corporate-research','infrastructure','scientific','security-of-owned-assets','general-research']);
const clean=(v,n=2000)=>String(v??'').trim().slice(0,n);
let queue=Promise.resolve();
const atomic=fn=>{const r=queue.then(fn);queue=r.catch(()=>{});return r;};
async function read(){try{const a=JSON.parse(await fs.readFile(file,'utf8'));return Array.isArray(a)?a:[];}catch(e){if(e.code==='ENOENT')return [];throw e;}}
async function write(a){await fs.mkdir(root,{recursive:true});const tmp=file+'.'+crypto.randomUUID();await fs.writeFile(tmp,JSON.stringify(a,null,2),{mode:0o600});await fs.rename(tmp,file);}
const err=message=>({ok:false,error:message});
export function assessSource(x){
 const type=clean(x.type,40),title=clean(x.title,240),url=clean(x.url,1000),summary=clean(x.summary,3000);
 if(!categories.has(type)||!title||!summary)return err('Valid source type, title, and summary required');
 if(url){let u;try{u=new URL(url);}catch{return err('Invalid URL');}if(u.protocol!=='https:'&&u.protocol!=='http:')return err('Only public HTTP(S) references allowed');if(u.username||u.password)return err('Credentials in URLs are not permitted');}
 if(x.authorized!==true)return err('Confirm the source was legally obtained and permitted for this investigation');
 const reliability=['unknown','low','medium','high'].includes(x.reliability)?x.reliability:'unknown';
 return {ok:true,source:{id:crypto.randomUUID(),type,title,url,summary,reliability,observedAt:clean(x.observedAt,40)||null,recordedAt:new Date().toISOString(),contentHash:crypto.createHash('sha256').update(JSON.stringify({type,title,url,summary})).digest('hex')}};
}
export function synthesize(caseFile){
 const sources=caseFile.sources||[];
 const facts=sources.map(x=>({sourceId:x.id,claim:x.summary,assessment:x.reliability}));
 const warnings=[];
 if(sources.length===0)warnings.push('No evidence recorded');
 if(sources.length===1)warnings.push('Only one source; seek independent corroboration');
 if(sources.some(x=>x.reliability==='unknown'||x.reliability==='low'))warnings.push('At least one source has unverified or low reliability');
 const domains=new Set(sources.map(x=>{try{return new URL(x.url).hostname;}catch{return null;}}).filter(Boolean));
 if(domains.size < 2)warnings.push('Independence of sources not established');
 return {caseId:caseFile.id,question:caseFile.question,sources:sources.length,distinctReferencedDomains:domains.size,facts,warnings,conclusion:'Not automatically established: evidence claims require human review and independent verification.'};
}
export async function createReconCase(payload){const question=clean(payload.question,500),purpose=clean(payload.purpose,60),scope=clean(payload.scope,1000);if(!question||!scope||!allowedPurposes.has(purpose))return err('Question, approved purpose, and investigation scope required');const item={id:crypto.randomUUID(),question,purpose,scope,status:'open',createdAt:new Date().toISOString(),sources:[],notes:[]};await atomic(async()=>{const db=await read();db.push(item);await write(db);});return {ok:true,case:item};}
export async function listReconCases(){const a=await read();return {ok:true,cases:a.map(({sources,notes,...c})=>({...c,sourceCount:sources.length,noteCount:notes.length}))};}
export async function getReconCase(id){const a=await read();const c=a.find(x=>x.id===id);return c?{ok:true,case:c,assessment:synthesize(c)}:err('Unknown case');}
export async function addReconSource(id,data){const assessed=assessSource(data);if(!assessed.ok)return assessed;return atomic(async()=>{const a=await read(),c=a.find(x=>x.id===id);if(!c)return err('Unknown case');if(c.status!=='open')return err('Case closed');c.sources.push(assessed.source);await write(a);return {ok:true,source:assessed.source};});}
export async function addReconNote(id,data){const text=clean(data.text,2500),kind=clean(data.kind,30);if(!text||!['observation','hypothesis','contradiction','next-step'].includes(kind))return err('Note text and valid kind required');return atomic(async()=>{const a=await read(),c=a.find(x=>x.id===id);if(!c)return err('Unknown case');if(c.status!=='open')return err('Case closed');const n={id:crypto.randomUUID(),kind,text,recordedAt:new Date().toISOString()};c.notes.push(n);await write(a);return {ok:true,note:n};});}
export async function closeReconCase(id){return atomic(async()=>{const a=await read(),c=a.find(x=>x.id===id);if(!c)return err('Unknown case');c.status='closed';c.closedAt=new Date().toISOString();await write(a);return {ok:true,caseId:id,status:'closed'};});}
