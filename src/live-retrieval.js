import {planTarget,rankEvidence} from './target-retrieval.js';
const MAX_RESULTS=12;
const ENDPOINTS={wikipedia:'https://en.wikipedia.org/w/api.php',crossref:'https://api.crossref.org/works',brave:'https://api.search.brave.com/res/v1/web/search'};
const truncate=(x,n=800)=>String(x??'').slice(0,n);
const clean=s=>truncate(s,500).replace(/[\x00-\x1f]/g,' ').trim();
const stripHtml=x=>truncate(x,1300).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const safeLink=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
async function getJSON(url,headers={},fetcher=globalThis.fetch){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8500);
 try{const r=await fetcher(url,{method:'GET',headers:{'Accept':'application/json','User-Agent':'SuperVelorenResearch/18.4 (authorized research)',...headers},signal:controller.signal,redirect:'error'});
 if(!r.ok)throw Error(`Provider returned HTTP ${r.status}`);
 const length=Number(r.headers?.get?.('content-length')||0);if(length>1200000)throw Error('Response too large');
 const data=await r.text();if(data.length>1200000)throw Error('Response too large');return JSON.parse(data);
 }finally{clearTimeout(timer);}
}
export async function liveSearch(input,{fetcher=globalThis.fetch,braveKey=process.env.BRAVE_SEARCH_API_KEY}={}){
 const plan=planTarget(input||{});if(!plan.ok)return plan;
 const providers=Array.isArray(input.providers)?input.providers:['wikipedia','crossref'];
 if(!providers.length||providers.length>3||!providers.every(x=>['wikipedia','crossref','brave'].includes(x)))return {ok:false,error:'Select wikipedia, crossref, or brave'};
 const query=clean(plan.objective).slice(0,230), docs=[], errors=[];
 const run=async name=>{
  try{
   if(name==='wikipedia'){
    const u=new URL(ENDPOINTS.wikipedia);u.searchParams.set('action','query');u.searchParams.set('list','search');u.searchParams.set('srsearch',query);u.searchParams.set('srlimit',String(MAX_RESULTS));u.searchParams.set('format','json');
    const data=await getJSON(u.href,{},fetcher);
    for(const item of (data?.query?.search||[]).slice(0,MAX_RESULTS))if(Number.isSafeInteger(item.pageid))docs.push({title:truncate(item.title,250),summary:stripHtml(item.snippet),reference:`https://en.wikipedia.org/?curid=${item.pageid}`,origin:'Wikipedia',collectedAt:new Date().toISOString()});
   }
   if(name==='crossref'){
    const u=new URL(ENDPOINTS.crossref);u.searchParams.set('query',query);u.searchParams.set('rows',String(MAX_RESULTS));
    const data=await getJSON(u.href,{},fetcher);
    for(const item of (data?.message?.items||[]).slice(0,MAX_RESULTS))docs.push({title:truncate(item.title?.[0],250),summary:stripHtml(item.abstract||item['container-title']?.[0]||''),reference:safeLink(item.URL)||safeLink(item.DOI&&`https://doi.org/${item.DOI}`),origin:'Crossref',collectedAt:new Date().toISOString()});
   }
   if(name==='brave'){
    if(!braveKey){errors.push({provider:name,error:'BRAVE_SEARCH_API_KEY not configured'});return;}
    const u=new URL(ENDPOINTS.brave);u.searchParams.set('q',query);u.searchParams.set('count',String(MAX_RESULTS));
    const data=await getJSON(u.href,{'X-Subscription-Token':braveKey},fetcher);
    for(const item of (data?.web?.results||[]).slice(0,MAX_RESULTS))docs.push({title:truncate(item.title,250),summary:stripHtml(item.description),reference:safeLink(item.url),origin:'Brave search',collectedAt:new Date().toISOString()});
   }
  }catch(err){errors.push({provider:name,error:truncate(err.message,200)});}
 };
 await Promise.all([...new Set(providers)].map(run));
 const valid=docs.filter(x=>x.title&&x.reference);
 const ranked=rankEvidence(plan,valid);
 return {ok:true,objective:plan.objective,providers,rawCount:valid.length,results:ranked.results,uncoveredKeywords:ranked.uncoveredKeywords,errors,liveQueries:providers.length,limitations:'Live public-source retrieval only. Search results are unverified leads; there is no direct dark-web crawl or access to protected systems.'};
}
