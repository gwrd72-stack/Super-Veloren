import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.join(process.cwd(),'data');
const file = path.join(root,'master-authority.json');
const auditFile = path.join(root,'master-audit.jsonl');
const masterToken=process.env.SUPER_VEL_MASTER_TOKEN || '';
if (masterToken.length < 32) throw Error('SUPER_VEL_MASTER_TOKEN must be a secret of at least 32 characters. See V16 instructions.');
const digest=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const equals=(a,b)=>{const x=Buffer.from(digest(a),'hex'),y=Buffer.from(digest(b),'hex');return crypto.timingSafeEqual(x,y);};
let queue=Promise.resolve();
const serialize=fn=>{const job=queue.then(fn);queue=job.catch(()=>{});return job;};
let auditTail='GENESIS';
const defaultState=()=>({version:1,positions:[],delegates:[],approvals:[]});
async function read(){try {return {...defaultState(),...JSON.parse(await fs.readFile(file,'utf8'))};} catch(e){if(e.code==='ENOENT')return defaultState();throw e;}}
async function save(state){await fs.mkdir(root,{recursive:true});const tmp=file+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(tmp,JSON.stringify(state,null,2),{mode:0o600});await fs.rename(tmp,file);}
async function audit(entry){await fs.mkdir(root,{recursive:true});let before=auditTail;if(before==='GENESIS'){try{const lines=(await fs.readFile(auditFile,'utf8')).trim().split('\n');const last=JSON.parse(lines.at(-1));before=last.hash || 'GENESIS';}catch{}}
 const evt={id:crypto.randomUUID(),at:new Date().toISOString(),previousHash:before,...entry};evt.hash=digest(JSON.stringify(evt));await fs.appendFile(auditFile,JSON.stringify(evt)+'\n',{mode:0o600});auditTail=evt.hash;}
const scopes=['read','research','chat','execute'];
function identity(req,state){const header=req.get('authorization')||'';const token=header.startsWith('Bearer ')?header.slice(7):'';
 if(!token)return null;
 if(equals(token,masterToken))return {role:'master',id:'master'};
 const d=state.delegates.find(x=>!x.revokedAt && crypto.timingSafeEqual(Buffer.from(digest(token),'hex'),Buffer.from(x.tokenHash,'hex')));
 if(!d)return null;return {role:'delegate',id:d.id,scopes:d.scopes};
}
function actionScope(req){if(req.method==='GET')return 'read';if(req.path.startsWith('/api/chat'))return 'chat';if(/^\/api\/(research|frontier|reason|scientist|investigator|physics|discovery|intelligence|recon|watch)/.test(req.path))return 'research';return 'execute';}
function sensitive(req){return req.path==='/api/crown'||req.path==='/api/multiply'||req.path.startsWith('/api/export/')||req.path.includes('/missions')||req.path.includes('/evidence')||req.path.includes('/tests')||req.path==='/api/research/cases'||(req.method!=='GET'&&req.path.startsWith('/api/watch/'))||(req.method==='POST'&&req.path.startsWith('/api/recon/'));}
export function authorityMiddleware(){return async(req,res,next)=>{try {
 if(req.path==='/api/health'||!req.path.startsWith('/api/'))return next();
 const state=await read();const principal=identity(req,state);
 if(!principal)return res.status(401).json({ok:false,error:'Authentication required'});
 req.principal=principal;
 if(req.path.startsWith('/api/authority/')){if(principal.role!=='master')return res.status(403).json({ok:false,error:'Only master may access governance endpoints'});return next();}
 if(principal.role==='master')return next();
 const scope=actionScope(req);if(!principal.scopes.includes(scope))return res.status(403).json({ok:false,error:'Scope not delegated',required:scope});
 if(sensitive(req)){
  const a=state.approvals.find(x=>x.id===req.get('x-super-vel-approval') && x.delegateId===principal.id && x.method===req.method && x.route===req.path && x.status==='approved' && new Date(x.expiresAt)>new Date());
  if(!a)return res.status(403).json({ok:false,error:'Master approval required for this action'});
  // One-use authorization: mark consumed before the operation to prevent replay.
  await serialize(async()=>{const fresh=await read();const item=fresh.approvals.find(x=>x.id===a.id);if(!item||item.status!=='approved')throw Error('Approval already consumed');item.status='consumed';await save(fresh);await audit({actor:principal.id,event:'approval.consumed',approvalId:a.id});});
 }
 return next();
 }catch(e){next(e);}};}
export function mountAuthority(app){
 app.get('/api/authority/status',async(req,res)=>{const s=await read();res.json({ok:true,principal:'master',positions:s.positions.length,delegates:s.delegates.filter(x=>!x.revokedAt).length,pending:s.approvals.filter(x=>x.status==='pending').length});});
 app.get('/api/authority/positions',async(req,res)=>{const s=await read();res.json({ok:true,positions:s.positions});});
 app.post('/api/authority/positions',async(req,res,next)=>{try{const topic=String(req.body?.topic||'').trim(),statement=String(req.body?.statement||'').trim();if(!topic||topic.length>100||!statement||statement.length>5000)return res.status(400).json({ok:false,error:'Provide topic and statement'});
 const item={id:crypto.randomUUID(),topic,statement,status:'confirmed',recordedAt:new Date().toISOString(),source:'master-direct'};
 await serialize(async()=>{const s=await read();s.positions.push(item);await save(s);await audit({actor:'master',event:'position.confirmed',itemId:item.id,topic});});res.status(201).json({ok:true,position:item});}catch(e){next(e);}});
 app.post('/api/authority/positions/:id/revoke',async(req,res,next)=>{try{const item=await serialize(async()=>{const s=await read();const p=s.positions.find(x=>x.id===req.params.id&&x.status==='confirmed');if(!p)return null;p.status='revoked';p.revokedAt=new Date().toISOString();await save(s);await audit({actor:'master',event:'position.revoked',itemId:p.id});return p;});if(!item)return res.status(404).json({ok:false,error:'Not found'});res.json({ok:true,position:item});}catch(e){next(e);}});
 app.get('/api/authority/delegates',async(req,res)=>{const s=await read();res.json({ok:true,delegates:s.delegates.map(({tokenHash,...safe})=>safe)});});
 app.post('/api/authority/delegates',async(req,res,next)=>{try{const name=String(req.body?.name||'').trim();const granted=req.body?.scopes;if(!name||name.length>100||!Array.isArray(granted)||granted.length===0||!granted.every(x=>scopes.includes(x)))return res.status(400).json({ok:false,error:'Name and valid scopes required'});
 const secret=crypto.randomBytes(32).toString('hex');const item={id:crypto.randomUUID(),name,scopes:[...new Set(granted)],tokenHash:digest(secret),createdAt:new Date().toISOString()};await serialize(async()=>{const s=await read();s.delegates.push(item);await save(s);await audit({actor:'master',event:'delegate.granted',delegateId:item.id,scopes:item.scopes});});const {tokenHash,...safe}=item;res.status(201).json({ok:true,delegate:safe,token:secret,warning:'This token is shown only once. Store securely.'});}catch(e){next(e);}});
 app.post('/api/authority/delegates/:id/revoke',async(req,res,next)=>{try{const d=await serialize(async()=>{const s=await read();const d=s.delegates.find(x=>x.id===req.params.id&&!x.revokedAt);if(!d)return null;d.revokedAt=new Date().toISOString();for(const a of s.approvals)if(a.delegateId===d.id&&a.status==='approved')a.status='revoked';await save(s);await audit({actor:'master',event:'delegate.revoked',delegateId:d.id});return d;});if(!d)return res.status(404).json({ok:false,error:'Not found'});res.json({ok:true,revoked:d.id});}catch(e){next(e);}});
 app.get('/api/authority/approvals',async(req,res)=>{const s=await read();res.json({ok:true,approvals:s.approvals});});
 app.post('/api/authority/approvals',async(req,res,next)=>{try{const delegateId=String(req.body?.delegateId||''),method=String(req.body?.method||'').toUpperCase(),route=String(req.body?.route||'');if(!['GET','POST'].includes(method)||!route.startsWith('/api/')||route.startsWith('/api/authority/')||route.length>200)return res.status(400).json({ok:false,error:'Invalid route/method'});
 const a=await serialize(async()=>{const s=await read();if(!s.delegates.some(d=>d.id===delegateId&&!d.revokedAt))return null;const item={id:crypto.randomUUID(),delegateId,method,route,status:'pending',reason:String(req.body?.reason||'').slice(0,500),createdAt:new Date().toISOString()};s.approvals.push(item);await save(s);await audit({actor:'master',event:'approval.requested',approvalId:item.id});return item;});if(!a)return res.status(404).json({ok:false,error:'Unknown delegate'});res.status(201).json({ok:true,approval:a});}catch(e){next(e);}});
 app.post('/api/authority/approvals/:id/decide',async(req,res,next)=>{try{const approve=req.body?.approve===true;const a=await serialize(async()=>{const s=await read();const a=s.approvals.find(x=>x.id===req.params.id&&x.status==='pending');if(!a)return null;a.status=approve?'approved':'denied';a.decidedAt=new Date().toISOString();if(approve)a.expiresAt=new Date(Date.now()+15*60*1000).toISOString();await save(s);await audit({actor:'master',event:approve?'approval.granted':'approval.denied',approvalId:a.id});return a;});if(!a)return res.status(404).json({ok:false,error:'Pending approval not found'});res.json({ok:true,approval:a});}catch(e){next(e);}});
 app.get('/api/authority/audit',async(req,res)=>{try{const lines=(await fs.readFile(auditFile,'utf8')).trim().split('\n');res.json({ok:true,events:lines.slice(-100).map(x=>JSON.parse(x))});}catch(e){if(e.code==='ENOENT')res.json({ok:true,events:[]});else throw e;}});
}

export async function loadPositions(){const state=await read();return state.positions.filter(p=>p.status==='confirmed');}
