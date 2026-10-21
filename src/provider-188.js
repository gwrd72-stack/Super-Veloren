import crypto from 'node:crypto';
const MAX_BODY=750000;
const safeText=(s,n=500)=>String(s??'').replace(/[\u0000-\u001f]/g,' ').slice(0,n);
const secretPattern=/\b(password|passphrase|secret|private.?key|access.?token|session.?cookie)\b/i;
function configFrom(env){
 const endpoint=env.V188_PROVIDER_URL,host=env.V188_PROVIDER_HOST,token=env.V188_PROVIDER_TOKEN;
 if(!endpoint||!host||!token)return {ok:false,error:'Configure V188_PROVIDER_URL, V188_PROVIDER_HOST and V188_PROVIDER_TOKEN'};
 let u;try{u=new URL(endpoint);}catch{return {ok:false,error:'Invalid configured provider URL'};}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname!==host||u.hash||netUnsafe(u.hostname))return {ok:false,error:'Provider must be a fixed, allowlisted HTTPS hostname'};
 return {ok:true,url:u.href,hostname:host,token};
}
function netUnsafe(host){return host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||/^\d+(\.\d+){3}$/.test(host)||host.includes(':');}
export function normalizeProvider188(data,{providerId='licensed-provider',limit=100}={}){
 if(!Array.isArray(data?.reports))return {ok:false,error:'Expected reports array'};
 if(data.reports.length>1000)return {ok:false,error:'Report count exceeds limit'};
 const accepted=[],rejected=[],seen=new Set();
 for(const x of data.reports.slice(0,limit)){
  if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>secretPattern.test(k))||x.rawCredentials||x.stolenData||x.passwords||x.fullDump){rejected.push('Secret-bearing or invalid report');continue;}
  const title=safeText(x.title,220),category=safeText(x.category||'other',35);
  if(!title.trim()||secretPattern.test(title)||!['vulnerability','exposure','fraud','infrastructure','research','other'].includes(category)){rejected.push('Invalid or sensitive metadata');continue;}
  let url;try{url=new URL(x.reference);}catch{rejected.push('Invalid reference');continue;}
  if(url.protocol!=='https:'||url.username||url.password||url.hostname.endsWith('.onion')||netUnsafe(url.hostname)){rejected.push('Disallowed citation');continue;}
  const id=crypto.createHash('sha256').update(`${providerId}:${url.href}:${title}`).digest('hex');if(seen.has(id))continue;seen.add(id);
  const summary=safeText(x.summary,1200);if(secretPattern.test(summary)){rejected.push('Potential credentials in summary');continue;}
  accepted.push({id,title,summary,category,reference:url.href,providerId,assessment:'unverified-third-party-report'});
 }
 return {ok:true,providerId,accepted,rejected,sourceStatus:'provider-claims-unverified',rawCount:data.reports.length};
}
export async function retrieveProvider188({limit=50}={}, {env=process.env,fetcher=globalThis.fetch}={}){
 const cfg=configFrom(env);if(!cfg.ok)return cfg;
 if(!Number.isInteger(limit)||limit<1||limit>100)return {ok:false,error:'limit must be 1..100'};
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetcher(cfg.url,{method:'GET',headers:{'Accept':'application/json','Authorization':`Bearer ${cfg.token}`},redirect:'error',signal:controller.signal});
  if(!response.ok)return {ok:false,error:`Provider HTTP ${response.status}`};
  if(Number(response.headers?.get?.('content-length')||0)>MAX_BODY)return {ok:false,error:'Response too large'};
  const body=await response.text();if(body.length>MAX_BODY)return {ok:false,error:'Response too large'};
  return normalizeProvider188(JSON.parse(body),{providerId:cfg.hostname,limit});
 }catch{return {ok:false,error:'Provider connection, validation or parsing failed'};}finally{clearTimeout(timer);}
}
