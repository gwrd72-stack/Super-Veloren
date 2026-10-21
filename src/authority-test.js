import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
process.env.SUPER_VEL_MASTER_TOKEN='a'.repeat(64);
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'sv-authority-'));
process.chdir(tmp);
const {authorityMiddleware,mountAuthority}=await import('./authority.js');
const routes=[];
const app={get:(p,fn)=>routes.push(['GET',p,fn]),post:(p,fn)=>routes.push(['POST',p,fn])};
mountAuthority(app);
const mw=authorityMiddleware();
async function call(method,url,body={},token='a'.repeat(64),headers={}){
 const req={method,path:url,body,params:{},get:(k)=>k.toLowerCase()==='authorization'?(token?'Bearer '+token:''):headers[k.toLowerCase()]||''};
 const res={statusCode:200,status(n){this.statusCode=n;return this;},json(obj){this.body=obj;return this;}};
 let nextError=null; let allowed=false;
 await mw(req,res,e=>{if(e)nextError=e;else allowed=true;});
 if(nextError)throw nextError;if(!allowed)return res;
 const route=routes.find(([m,p])=>m===method&&(p===url||(p.includes('/:')&&new RegExp('^'+p.replace(/:\w+/g,'[^/]+')+'$').test(url))));
 if(route){const parts=route[1].split('/'),actual=url.split('/');parts.forEach((x,i)=>{if(x.startsWith(':'))req.params[x.slice(1)]=actual[i];});}
 if(!route){res.json({allowed:true});return res;}
 await new Promise((resolve,reject)=>{try{const ret=route[2](req,res,e=>e?reject(e):resolve());Promise.resolve(ret).then(resolve,reject);}catch(e){reject(e);}});
 return res;
}
let r=await call('GET','/api/authority/status',{},'');assert.equal(r.statusCode,401);
r=await call('GET','/api/authority/status');assert.equal(r.body.ok,true);
r=await call('POST','/api/authority/positions',{topic:'Drive',statement:'Explore speculative mechanisms; do not claim unverified results.'});assert.equal(r.statusCode,201);
r=await call('GET','/api/authority/positions');assert.equal(r.body.positions.length,1);
r=await call('POST','/api/authority/delegates',{name:'Lab Assistant',scopes:['read','research']});assert.equal(r.statusCode,201);const delegate=r.body.token;
r=await call('GET','/api/store',{},delegate);assert.equal(r.body.allowed,true);
r=await call('POST','/api/chat',{},delegate);assert.equal(r.statusCode,403);
r=await call('POST','/api/research/analyze',{},delegate);assert.equal(r.body.allowed,true);
r=await call('POST','/api/research/cases',{},delegate);assert.equal(r.statusCode,403);
r=await call('POST','/api/authority/approvals',{delegateId:r.body?.id||'',method:'POST',route:'/api/research/cases'});assert.equal(r.statusCode,404);
const delegates=(await call('GET','/api/authority/delegates')).body.delegates;
const id=delegates[0].id;
r=await call('POST','/api/authority/approvals',{delegateId:id,method:'POST',route:'/api/research/cases'});assert.equal(r.statusCode,201);const approvalId=r.body.approval.id;
r=await call('POST',`/api/authority/approvals/${approvalId}/decide`,{approve:true}); // simulated parameter route below
assert.equal(r.statusCode,200);
r=await call('POST','/api/research/cases',{},delegate,{'x-super-vel-approval':approvalId});assert.equal(r.body.allowed,true);
r=await call('POST','/api/research/cases',{},delegate,{'x-super-vel-approval':approvalId});assert.equal(r.statusCode,403);
r=await call('POST',`/api/authority/delegates/${id}/revoke`);assert.equal(r.statusCode,200);
r=await call('GET','/api/store',{},delegate);assert.equal(r.statusCode,401);
const audit=await call('GET','/api/authority/audit');assert(audit.body.events.length>=5);
console.log('PASS: authorization, positions, delegations, approvals, replay prevention, revocation, audit');
await fs.rm(tmp,{recursive:true,force:true});
