import assert from 'node:assert/strict';
import {liveSearch} from './live-retrieval.js';
let requests=[];
const fake=async (url,opts)=>{
 requests.push(new URL(url));
 const h=new URL(url).hostname;
 const data=h==='en.wikipedia.org'?{query:{search:[{pageid:42,title:'Magnetic resonance research',snippet:'Measurement of magnetic resonance frequencies'}]}}:
 h==='api.crossref.org'?{message:{items:[{title:['Magnetic resonance measurement research'],URL:'https://doi.org/10.1000/example',abstract:'Magnetic resonance measured experimentally'}]}}:
 {web:{results:[{title:'Magnetic resonance new paper',url:'https://example.org/paper',description:'Magnetic resonance frequency results'}]}};
 return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(data)};
};
const input={objective:'magnetic resonance measurement research'};
let r=await liveSearch(input,{fetcher:fake});assert(r.ok);assert.equal(r.rawCount,2);assert(r.results.length>=1);assert.equal(r.errors.length,0);assert(requests.some(x=>x.hostname==='en.wikipedia.org'));assert(requests.some(x=>x.hostname==='api.crossref.org'));
requests=[];r=await liveSearch({...input,providers:['brave']},{fetcher:fake});assert(r.ok);assert.equal(r.errors[0].provider,'brave');assert.equal(requests.length,0);
r=await liveSearch({...input,providers:['brave']},{fetcher:fake,braveKey:'test-token'});assert(r.ok);assert(r.rawCount===1);assert.equal(requests[0].hostname,'api.search.brave.com');
r=await liveSearch({...input,providers:['https://unknown.example']},{fetcher:fake});assert.equal(r.ok,false);
const fail=async()=>{throw Error('network offline')};r=await liveSearch(input,{fetcher:fail});assert(r.ok);assert.equal(r.errors.length,2);
console.log('V18.4 live retrieval: 12 assertions passed (mocked network)');
