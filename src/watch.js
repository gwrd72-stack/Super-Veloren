import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
const file=path.join(process.cwd(),'data','watch-state.json');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
let queue=Promise.resolve();
const serial=fn=>{const job=queue.then(fn);queue=job.catch(()=>{});return job;};
const empty=()=>({sources:[],findings:[],lastRun:null});
async function read(){try{return {...empty(),...JSON.parse(await fs.readFile(file,'utf8'))};}catch(e){if(e.code==='ENOENT')return empty();throw e;}}
async function write(a){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+crypto.randomUUID();await fs.writeFile(tmp,JSON.stringify(a,null,2),{mode:0o600});await fs.rename(tmp,file);}
function validFeedUrl(value){let u;try{u=new URL(value);}catch{return false;}
 if(u.protocol!=='https:' || u.username || u.password || u.port && u.port!=='443')return false;
 if(u.hostname==='localhost'||u.hostname.endsWith('.local')||u.hostname.endsWith('.internal')||u.hostname.endsWith('.onion')||net.isIP(u.hostname))return false;
 if(u.hostname.length>200||u.pathname.length>600)return false;
 return true;}
const clean=(s,n=2000)=>String(s??'').trim().slice(0,n);
const unescapeXml=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const strip=s=>unescapeXml(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')).trim();
function tag(text,names){for(const name of names){const match=text.match(new RegExp('<(?:[\\w-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?'+name+'>','i'));if(match)return clean(strip(match[1]),2000);}return '';}
export function parseFeed(xml){const blocks=[...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].slice(0,100);return blocks.map(([,type,body])=>{
 const title=tag(body,['title']);const summary=tag(body,['description','summary','content']);const id=tag(body,['guid','id'])||title;
 const rawLink=body.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1]||tag(body,['link']);
 return {title,summary,externalId:clean(id,500),link:validFeedUrl(rawLink)?rawLink:null};}).filter(x=>x.title);}
export async function addSource(p){const name=clean(p.name,120),url=clean(p.url,900),category=clean(p.category,40);
 if(!name||!validFeedUrl(url)||!['research','security','infrastructure','business','general'].includes(category))return {ok:false,error:'Name, public HTTPS feed URL and approved category required'};
 return serial(async()=>{const s=await read();if(s.sources.length>=40)return {ok:false,error:'Source limit reached'};
 if(s.sources.some(x=>x.url===url))return {ok:false,error:'Duplicate source'};
 const record={id:crypto.randomUUID(),name,url,category,enabled:true,createdAt:new Date().toISOString(),lastChecked:null,lastError:null};s.sources.push(record);await write(s);return {ok:true,source:record};});}
export async function removeSource(id){return serial(async()=>{const s=await read(),before=s.sources.length;s.sources=s.sources.filter(x=>x.id!==id);await write(s);return {ok:before!==s.sources.length};});}
export async function status(){const s=await read();return {ok:true,sources:s.sources,lastRun:s.lastRun,findings:s.findings.slice(-100).reverse()};}
// A report can originate from an authorized dark-web threat-intelligence provider. Vel never
// fetches .onion URLs, buys compromised information, or attempts intrusion.
export async function ingestReport(p){const origin=clean(p.origin,40),title=clean(p.title,180),summary=clean(p.summary,3000),reference=clean(p.reference,700);
 if(!['approved-threat-feed','user-supplied','public-report'].includes(origin)||!title||!summary||p.authorized!==true)return {ok:false,error:'An approved origin, title, summary and explicit authorization are required'};
 return serial(async()=>{const s=await read(),id=hash(origin+'|'+title+'|'+summary);if(s.findings.some(x=>x.id===id))return {ok:true,duplicate:true};
 const item={id,origin,title,summary,reference,category:'external-intelligence',collectedAt:new Date().toISOString(),read:false,confidence:'unverified',warning:'Report is a lead, not independently confirmed evidence'};s.findings.push(item);s.findings=s.findings.slice(-1000);await write(s);return {ok:true,finding:item};});}
export async function markRead(id){return serial(async()=>{const s=await read(),f=s.findings.find(x=>x.id===id);if(!f)return {ok:false,error:'Unknown finding'};f.read=true;await write(s);return {ok:true};});}
export async function scan({fetcher=globalThis.fetch}={}){const sources=(await read()).sources.filter(x=>x.enabled);let total=0;
 for(const source of sources){let entries=[],error=null;
 try{if(!validFeedUrl(source.url))throw Error('Invalid source URL');
 const response=await fetcher(source.url,{redirect:'error',signal:AbortSignal.timeout(9000),headers:{accept:'application/rss+xml,application/atom+xml,application/xml,text/xml'}});
 if(!response.ok)throw Error('HTTP '+response.status);
 const mime=response.headers?.get?.('content-type')||'';if(mime && !/(xml|rss|atom|text\/plain)/i.test(mime))throw Error('Unexpected content type');
 const size=Number(response.headers?.get?.('content-length')||0);if(size>1048576)throw Error('Feed too large');
 const body=await response.text();if(body.length>1048576)throw Error('Feed too large');entries=parseFeed(body);
 }catch(e){error=clean(e.message,160);}
 await serial(async()=>{const s=await read(),current=s.sources.find(x=>x.id===source.id);if(!current)return;current.lastChecked=new Date().toISOString();current.lastError=error;
 for(const entry of entries){const id=hash(source.id+'|'+entry.externalId);if(s.findings.some(x=>x.id===id))continue;
 s.findings.push({id,sourceId:source.id,origin:'public-feed',title:entry.title,summary:entry.summary,reference:entry.link,category:source.category,collectedAt:new Date().toISOString(),read:false,confidence:'unverified'});total++;}
 s.findings=s.findings.slice(-1000);s.lastRun=new Date().toISOString();await write(s);});}
 return {ok:true,checked:sources.length,newFindings:total};}
export function startPolling(){if(process.env.SUPER_VEL_WATCH_ENABLED!=='true')return;
 const minutes=Math.max(15,Math.min(1440,Number(process.env.SUPER_VEL_WATCH_MINUTES)||60));
 const timer=setInterval(()=>scan().catch(e=>console.error('Watch scan:',e.message)),minutes*60*1000);timer.unref();
 scan().catch(e=>console.error('Initial scan:',e.message));}
