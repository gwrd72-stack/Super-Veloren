import { sciencePython } from './python-runtime.js';
import {spawn} from 'node:child_process';
const operations=new Set(['eigen','integral','optimize','orbit','em_wave','decay']);
export function advancedScience(request){
 if(!request||!operations.has(request.operation))return Promise.resolve({ok:false,error:'Unsupported operation'});
 let data=JSON.stringify(request);if(data.length>45000)return Promise.resolve({ok:false,error:'Request too large'});
 return new Promise(resolve=>{
  const py=sciencePython();
  const child=spawn(py,['src/advanced_engine.py'],{cwd:process.cwd(),stdio:['pipe','pipe','pipe'],windowsHide:true});let out='',finished=false;
  const done=r=>{if(finished)return;finished=true;clearTimeout(timer);resolve(r)};
  const timer=setTimeout(()=>{child.kill('SIGKILL');done({ok:false,error:'Timeout'});},8000);
  child.on('error',e=>done({ok:false,error:e.message}));
  child.stdout.on('data',b=>{out+=b.toString();if(out.length>300000){child.kill('SIGKILL');done({ok:false,error:'Output cap exceeded'});}});
  child.on('close',()=>{try{done(JSON.parse(out))}catch{done({ok:false,error:'Invalid engine output'})}});
  child.stdin.end(data);
 });
}
