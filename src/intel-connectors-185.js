// V18.5: bounded, read-only collection from the fixed CISA KEV public advisory feed.
// No arbitrary URLs, hidden services, credential dumps, or unapproved hosts.
const KEV_URL='https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
export function normalizeKev(data,limit=50){
 if(!data||!Array.isArray(data.vulnerabilities))return {ok:false,error:'Invalid KEV feed'};
 const n=Math.max(1,Math.min(100,Math.trunc(Number(limit)||50)));
 const incidents=data.vulnerabilities.slice(-n).reverse().map(v=>({
  externalId:String(v.cveID||'').slice(0,32),
  title:String(v.vulnerabilityName||v.cveID||'').slice(0,200),
  summary:String(v.shortDescription||'').slice(0,1500),
  category:'vulnerability',severity:'high',assessment:'single-provider',
  reference:'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
  occurredAt:/^\d{4}-\d{2}-\d{2}$/.test(v.dateAdded||'')?v.dateAdded:null,
  indicators:[{type:'cve',value:String(v.cveID||'').slice(0,30)}],
  exploitedInWild:true,authorized:true
 })).filter(v=>/^CVE-\d{4}-\d{4,}$/.test(v.externalId)&&v.summary);
 return {ok:true,source:'CISA KEV public feed',count:incidents.length,incidents,disclaimer:'Listed exploitation does not imply an affected system belongs to the user; this is not dark-web collection.'};
}
export async function fetchKev({fetcher=globalThis.fetch,limit=50}={}){
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),9000);
 try{
  const r=await fetcher(KEV_URL,{headers:{Accept:'application/json'},signal:controller.signal,redirect:'error'});
  if(!r.ok)throw Error(`Feed HTTP ${r.status}`);
  const len=Number(r.headers?.get?.('content-length')||0);if(len>6000000)throw Error('Feed exceeds maximum size');
  const body=await r.text();if(body.length>6000000)throw Error('Feed exceeds maximum size');
  return normalizeKev(JSON.parse(body),limit);
 }catch(e){return {ok:false,error:String(e.message).slice(0,180)};}
 finally{clearTimeout(timeout);}
}
export function matchAdvisories(records,terms){
 if(!Array.isArray(records)||!Array.isArray(terms)||terms.length>20)return {ok:false,error:'Supply advisory records and up to 20 search terms'};
 const q=terms.map(t=>String(t).toLowerCase().trim().slice(0,90)).filter(t=>t.length>=3);
 if(!q.length)return {ok:false,error:'At least one search term is required'};
 const matched=records.filter(x=>q.some(t=>(`${x.title} ${x.summary} ${x.externalId}`).toLowerCase().includes(t))).slice(0,100);
 return {ok:true,total:records.length,matched:matched.length,results:matched,caveat:'Keyword leads are not proof that a specific asset is vulnerable.'};
}
