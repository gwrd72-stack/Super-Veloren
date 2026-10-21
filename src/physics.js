import { sciencePython } from './python-runtime.js';
import {spawn} from 'node:child_process';
const ALLOWED=new Set(['oscillator','rlc','projectile','inverse_square','resonance']);
export function physics(input){
 if(!input||!ALLOWED.has(input.operation))return Promise.resolve({ok:false,error:'Unknown physics operation'});
 const data=JSON.stringify(input);
 if(data.length>125000)return Promise.resolve({ok:false,error:'Request too large'});
 const python=sciencePython();
 return new Promise(resolve=>{
  const child=spawn(python,['src/physics_engine.py'],{cwd:process.cwd(),stdio:['pipe','pipe','pipe'],windowsHide:true});
  let done=false,out='';
  const finish=r=>{if(done)return;done=true;clearTimeout(timer);resolve(r);};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish({ok:false,error:'Physics engine timed out'});},15000);
  child.on('error',e=>finish({ok:false,error:String(e.message)}));
  child.stdout.on('data',b=>{out+=String(b);if(out.length>800000)child.kill('SIGKILL');});
  child.on('close',()=>{try{finish(JSON.parse(out));}catch{finish({ok:false,error:'Physics engine failed'});}});
  child.stdin.end(data);
 });
}
