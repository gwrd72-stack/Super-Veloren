import assert from 'node:assert/strict';
import {executeWorkbench,reviewResearch,reasonWithModel} from './intelligence.js';
const p=executeWorkbench({problem:'Analyze a repeatable experimental observation',steps:[{tool:'dimensions',args:{left:{M:1,L:1},right:{M:1,L:1}}}]});assert.equal(p.ok,true);assert.equal(p.allToolsSucceeded,true);assert.equal(p.results[0].result.consistent,true);
assert.equal(executeWorkbench({problem:'Analyze a repeatable observation',steps:[{tool:'shell',args:{command:'rm'}}]}).ok,false);
assert.equal(executeWorkbench({problem:'Analyze a repeatable observation',steps:Array.from({length:7},()=>({tool:'dimensions',args:{left:{},right:{}}}))}).ok,false);
const r=reviewResearch({problem:'Explain a new experimental observation',hypotheses:[{claim:'A',prediction:'signal rises',falsifier:'flat signal',evidence:['run 1']},{claim:'B'}]});assert.equal(r.ok,true);assert.equal(r.review[0].testable,true);assert.equal(r.review[1].testable,false);
assert.equal(reviewResearch({problem:'Explain something unusual',hypotheses:[{claim:'Only one'}]}).ok,false);
if(!process.env.OPENAI_API_KEY){const noKey=await reasonWithModel({problem:'Explain observed oscillations'});assert.equal(noKey.ok,false);assert.match(noKey.error,/OPENAI_API_KEY/);}
console.log('V16.1 intelligence tests: 7 assertions passed');
