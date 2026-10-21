import crypto from 'node:crypto';
import {planTarget,rankEvidence} from './target-retrieval.js';
const str=(x,n=800)=>typeof x==='string'?x.trim().slice(0,n):'';
const tok=s=>new Set((str(s,10000).toLowerCase().match(/[a-z0-9]+/g)||[]).filter(x=>x.length>2));
const intersection=(a,b)=>[...a].filter(x=>b.has(x)).length;
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const validRef=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hostname.endsWith('.onion')&&u.hostname.includes('.');}catch{return false;}};
// Source provenance and independence matter more than duplicate mentions.
export function corroborate(records, options={}){
 if(!Array.isArray(records)||records.length>1000)return {ok:false,error:'Up to 1000 reports required'};
 const normalized=records.filter(x=>x&&typeof x==='object').map(x=>({id:str(x.id,130),title:str(x.title,230),summary:str(x.summary,2000),source:str(x.providerId||x.origin||x.providerName,130),reference:validRef(x.reference)?x.reference:null,assessment:str(x.assessment,40)||'unverified',category:str(x.category,50),severity:str(x.severity,40),occurredAt:str(x.occurredAt||x.collectedAt,50)})).filter(x=>x.title&&x.source);
 const groups=[];
 for(const item of normalized){const key=tok(item.title+' '+item.summary.slice(0,250));let match=groups.find(g=>{const comparison=tok(g.representative.title+' '+g.representative.summary.slice(0,250));return intersection(key,comparison)/Math.max(1,Math.min(key.size,comparison.size))>=0.74;});if(!match){match={representative:item,reports:[]};groups.push(match);}match.reports.push(item);}
 const findings=groups.map(g=>{const uniqueSources=[...new Set(g.reports.map(r=>r.source))];const references=[...new Set(g.reports.map(r=>r.reference).filter(Boolean))];const evidenceCount=g.reports.length;const independentSourceCount=uniqueSources.length;
 const status=independentSourceCount>=2?'multi-provider-unverified':'single-provider-unverified';return {title:g.representative.title,reportCount:evidenceCount,independentSourceCount,providers:uniqueSources,references,assessment:status,flag:independentSourceCount>=2?'Multiple named providers reported similar claims; independent underlying evidence is not established':'Requires independent corroboration',digest:hash(g.reports.map(x=>[x.title,x.source,x.reference]).sort())};});
 return {ok:true,total:findings.length,findings:findings.sort((a,b)=>b.independentSourceCount-a.independentSourceCount||b.reportCount-a.reportCount),limitations:'Provider diversity is not proof that reports have independent origins or are factually correct.'};
}
export function investigateTarget(input,documents){
 const plan=planTarget(input);if(!plan.ok)return plan;
 const ranked=rankEvidence(plan,documents);if(!ranked.ok)return ranked;
 const best=ranked.results.slice(0,25);
 const provenance=corroborate(best.map(x=>({id:x.id,title:x.title,summary:x.summary,origin:x.origin||'unknown',reference:x.reference,assessment:x.assessment})));
 const verified=best.filter(x=>x.reference&&validRef(x.reference)).length;
 return {ok:true,objective:plan.objective,project:plan.project,queries:plan.queries,found:ranked.total,results:best,provenance,coverage:{matchedKeywords:[...new Set(best.flatMap(x=>x.matchedKeywords))],missingKeywords:ranked.uncoveredKeywords,validHttpsReferences:verified},nextActions:[...ranked.nextSteps.slice(0,5),'Seek primary documents, original measurements, and independent confirmation before concluding'],auditDigest:hash({objective:plan.objective,results:best.map(x=>x.id)}),limitations:'Local indexed intelligence only. No real-time web or dark-web search performed.'};
}
export function exposureAssessment(input){
 if(!input||!Array.isArray(input.reports)||input.reports.length>1000)return {ok:false,error:'Provide up to 1000 authorized, sanitized reports'};
 const allowed=new Set(['credential-exposure','ransomware','vulnerability','fraud','infrastructure','research','other']);const severity={critical:5,high:4,medium:3,low:2,informational:1,unknown:0};
 const reports=input.reports.filter(r=>r&&allowed.has(r.category)&&r.authorized===true&&typeof r.title==='string'&&!r.rawCredentials&&!r.credentialDump&&!r.stolenData&&!r.passwords).map(r=>({title:str(r.title,180),summary:str(r.summary,500).replace(/(?:password|token|secret|api[_ -]?key)\s*[:=]\s*\S+/gi,'[REDACTED]'),source:str(r.providerId||r.providerName,100),category:r.category,severity:severity[r.severity]??0,reference:validRef(r.reference)?r.reference:null})).filter(r=>r.title&&r.source);
 const matches=corroborate(reports.map(r=>({...r,origin:r.source})));
 return {ok:true,accepted:reports.length,rejected:input.reports.length-reports.length,highPriority:reports.filter(r=>r.severity>=4).length,findings:matches.findings,handling:'Do not collect raw credentials or breach dumps; investigate affected assets only with permission.',limitations:'Third-party reports are unverified; not direct hidden-service monitoring.'};
}
