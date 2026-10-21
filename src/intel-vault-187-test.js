import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {corroborate187,planFollowups187,seal187,open187,saveIntel187,readIntel187} from './intel-vault-187.js';
const secret='a-strong-test-secret-that-has-at-least-32-characters';
const r=corroborate187({objective:'Investigate verified exposure advisories',reports:[
 {title:'Report A',providerId:'p1',reference:'https://example.org/a',category:'exposure'},
 {title:'Report A duplicated',providerId:'p1',reference:'https://example.org/a',category:'exposure'},
 {title:'Report B',providerId:'p2',reference:'https://example.com/b',category:'exposure'},
 {title:'Onion',providerId:'p3',reference:'http://hidden.onion/a'},
 {title:'Dump',providerId:'p4',reference:'https://example.com/b',stolenData:true}
]});
assert.equal(r.ok,true);assert.equal(r.evidence.length,2);assert.equal(r.independentProviders,2);assert.equal(r.rejected.length,2);assert.match(r.corroboration,/not-independent-proof/);
assert.equal(corroborate187({objective:'no',reports:[]}).ok,false);
const follow=planFollowups187({objective:'Investigate verified exposure advisories',uncoveredTerms:['satellite','RF','http://evil.com']});assert.equal(follow.queries.length,1);assert.match(follow.authorization,/Master/);
const box=seal187(r,secret);assert.deepEqual(open187(box,secret),r);assert.throws(()=>open187(box,'wrong-secret-with-more-than-thirty-two-chars'));
const modified={...box,ciphertext:box.ciphertext.slice(0,-3)+'AAA'};assert.throws(()=>open187(modified,secret));
const root=await fs.mkdtemp(path.join(os.tmpdir(),'vel187-'));
try{const saved=await saveIntel187(r,{root,secret});assert.equal(saved.ok,true);const loaded=await readIntel187(saved.id,{root,secret});assert.deepEqual(loaded.report,r);assert.equal((await readIntel187('../secret',{root,secret})).ok,false);assert.equal((await saveIntel187(r,{root,secret:'short'})).ok,false);}finally{await fs.rm(root,{recursive:true,force:true});}
console.log('V18.7 intelligence integrity: 14 assertions passed');
