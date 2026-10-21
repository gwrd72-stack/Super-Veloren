import crypto from 'node:crypto';
const clean = s => typeof s === 'string' ? s.trim() : '';
const allowed = new Set(['observation','hypothesis','prediction','refutation']);
const sha = x => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function assessFrontier190({claims=[],evidence=[]}={}) {
 if(!Array.isArray(claims)||claims.length>40||!Array.isArray(evidence)||evidence.length>200)return {ok:false,error:'Invalid bounded research input'};
 const ids=new Set();for(const e of evidence){if(!e||!clean(e.id)||ids.has(e.id)||!clean(e.reference))return {ok:false,error:'Evidence needs unique ID and reference'};ids.add(e.id);}
 const findings=[];
 for(const c of claims){if(!c||!allowed.has(c.type)||!clean(c.statement)||!Array.isArray(c.evidenceIds)||c.evidenceIds.length>25)return {ok:false,error:'Invalid claim'};
 const missing=c.evidenceIds.filter(id=>!ids.has(id));const testable=!!clean(c.disconfirmingTest);
 findings.push({statement:c.statement,type:c.type,missingEvidence:missing,testable,supportedByLinkedRecords:missing.length===0&&c.evidenceIds.length>0,reviewNeeded:missing.length>0||!testable});
 }
 return {ok:true,findings,readyForIndependentReview:findings.length>0&&findings.every(x=>!x.reviewNeeded),warning:'Linked references do not establish truth; independent review is required',digest:sha({claims,evidence})};
}
export function auditRetrieval190({objective,findings=[]}={}) {
 if(!clean(objective)||!Array.isArray(findings)||findings.length>200)return {ok:false,error:'Invalid retrieval input'};
 const seen=new Set(),valid=[],rejected=[];
 for(const f of findings){try{const u=new URL(f.reference);if(u.protocol!=='https:'||u.username||u.password||u.hostname.endsWith('.onion')||!clean(f.title)||!clean(f.providerId))throw Error('invalid');
 const key=sha([u.href,clean(f.title).toLowerCase()]);if(seen.has(key))continue;seen.add(key);valid.push({title:f.title,reference:u.href,providerId:f.providerId,verified:!!f.independentlyVerified});
 }catch{rejected.push('Unverifiable citation or report');}}
 const providers=[...new Set(valid.map(x=>x.providerId))];return {ok:true,objective,accepted:valid,rejectedCount:rejected.length,distinctProviders:providers.length,independentlyVerified:valid.filter(x=>x.verified).length,corroborated:providers.length>=2,warning:'Provider count does not prove independence; provider verification must be externally established'};
}
export function autonomyGate190({proposal,approvedDigest,executionScope=[]}={}) {
 if(!proposal||typeof proposal!=='object'||Array.isArray(proposal)||!Array.isArray(proposal.steps)||proposal.steps.length<1||proposal.steps.length>8)return {ok:false,error:'Invalid proposal'};
 const permitted=new Set(['math','physics','compareEvidence','searchApprovedSource','storeCase']);
 for(const step of proposal.steps){if(!step||!permitted.has(step.tool)||!executionScope.includes(step.tool))return {ok:false,error:'Tool outside authorized scope'};}
 const digest=sha(proposal);return {ok:true,proposalDigest:digest,approved:approvedDigest===digest,executeAllowed:approvedDigest===digest,steps:proposal.steps.length,warning:'Approval does not execute the proposal; downstream tools must enforce their own permissions'};
}
export function securityAudit190({providerUrl='',requestLimit=25,allowRedirects=false}={}) {
 let safe=false;try{const u=new URL(providerUrl);safe=u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.hostname.endsWith('.onion')&&!['localhost','127.0.0.1','::1'].includes(u.hostname)&&!u.hostname.endsWith('.local');}catch{}
 const checks={httpsExternal:safe,boundedRequest:Number.isInteger(requestLimit)&&requestLimit>=1&&requestLimit<=100,noRedirects:allowRedirects===false};
 return {ok:true,checks,pass:Object.values(checks).every(Boolean),warning:'Configuration validation only; DNS rebinding, live transport and penetration testing are not covered'};
}
