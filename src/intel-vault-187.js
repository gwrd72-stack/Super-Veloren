import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
const ALLOWED=new Set(['research','vulnerability','exposure','fraud','infrastructure','other']);
const canonical=x=>JSON.stringify(x,Object.keys(x).sort());
const fingerprint=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function corroborate187({objective,reports}={}){
 if(typeof objective!=='string'||objective.trim().length<5||objective.length>1000||!Array.isArray(reports)||reports.length>200)return {ok:false,error:'Invalid investigation'};
 const seen=new Set(),sources=new Set(),verified=[],rejected=[];
 for(const r of reports){
  if(!r||typeof r!=='object'||typeof r.title!=='string'||typeof r.providerId!=='string'||!r.title.trim()||!r.providerId.trim()){rejected.push('Incomplete source');continue;}
  if(r.rawCredentials||r.stolenData||r.passwords){rejected.push('Sensitive payload excluded');continue;}
  if(!ALLOWED.has(r.category||'other')){rejected.push('Unsupported category');continue;}
  const reference=String(r.reference||'');let url;try{url=new URL(reference);}catch{rejected.push('Invalid citation');continue;}
  if(url.protocol!=='https:'||url.username||url.password||url.hostname.endsWith('.onion')){rejected.push('Unsupported reference');continue;}
  const key=String(r.providerId).slice(0,100)+'|'+url.href;
  if(seen.has(key))continue;seen.add(key);sources.add(String(r.providerId).slice(0,100));
  verified.push({title:r.title.slice(0,240),providerId:r.providerId.slice(0,100),category:r.category||'other',reference:url.href,assessment:'unverified-third-party-claim'});
 }
 return {ok:true,objective:objective.trim(),evidence:verified,independentProviders:sources.size,corroboration:sources.size>=2?'multiple-providers-not-independent-proof':'single-or-no-provider',rejected,conclusion:'Source agreement is not proof of accuracy',digest:fingerprint(verified)};
}
export function planFollowups187({objective,uncoveredTerms=[],reports=[]}={}){
 if(typeof objective!=='string'||objective.trim().length<5||!Array.isArray(uncoveredTerms)||!Array.isArray(reports))return {ok:false,error:'Invalid objective'};
 const clean=uncoveredTerms.filter(x=>typeof x==='string'&&/^[a-z0-9 _-]{3,45}$/i.test(x)).slice(0,5);
 const topics=[...new Set(clean.map(x=>x.toLowerCase()))];
 return {ok:true,queries:topics.map(t=>`${objective.slice(0,150)} ${t}`.slice(0,200)),nextActions:['Identify a primary source','Compare independent reporting','Verify timestamps and provenance'],authorization:'Master approval required before any external action'};
}
function keyFrom(secret,salt){if(typeof secret!=='string'||secret.length<32)throw Error('V187_INTEL_VAULT_KEY must be at least 32 characters');return crypto.scryptSync(secret,salt,32,{N:16384,r:8,p:1,maxmem:32*1024*1024});}
export function seal187(value,secret){const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),key=keyFrom(secret,salt),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const content=Buffer.from(JSON.stringify(value),'utf8');if(content.length>500000)throw Error('Record too large');const ct=Buffer.concat([cipher.update(content),cipher.final()]);return {version:1,salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ct.toString('base64')};}
export function open187(box,secret){if(!box||box.version!==1)throw Error('Invalid vault record');const salt=Buffer.from(box.salt,'base64'),iv=Buffer.from(box.iv,'base64'),tag=Buffer.from(box.tag,'base64');if(salt.length!==16||iv.length!==12||tag.length!==16)throw Error('Invalid envelope');const decipher=crypto.createDecipheriv('aes-256-gcm',keyFrom(secret,salt),iv);decipher.setAuthTag(tag);const text=Buffer.concat([decipher.update(Buffer.from(box.ciphertext,'base64')),decipher.final()]).toString('utf8');return JSON.parse(text);}
export async function saveIntel187(report,{secret=process.env.V187_INTEL_VAULT_KEY,root=path.join(process.cwd(),'data','v187-encrypted')}={}){
 if(!report?.ok||!Array.isArray(report.evidence))return {ok:false,error:'Only normalized reports may be archived'};
 if(!secret||secret.length<32)return {ok:false,error:'Configure V187_INTEL_VAULT_KEY (32+ chars)'};
 await fs.mkdir(root,{recursive:true,mode:0o700});const id=crypto.randomUUID();const filename=path.join(root,id+'.json');await fs.writeFile(filename,JSON.stringify(seal187(report,secret)),{flag:'wx',mode:0o600});return {ok:true,id,encrypted:true};
}
export async function readIntel187(id,{secret=process.env.V187_INTEL_VAULT_KEY,root=path.join(process.cwd(),'data','v187-encrypted')}={}){
 if(!/^[0-9a-f-]{36}$/.test(id||''))return {ok:false,error:'Invalid record ID'};
 if(!secret||secret.length<32)return {ok:false,error:'Vault key missing'};
 try{return {ok:true,report:open187(JSON.parse(await fs.readFile(path.join(root,id+'.json'),'utf8')),secret)};}catch(e){if(e.code==='ENOENT')return {ok:false,error:'Not found'};return {ok:false,error:'Decryption or integrity check failed'};}
}
