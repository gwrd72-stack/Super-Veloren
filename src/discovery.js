import { sciencePython } from './python-runtime.js';
import {spawn} from 'node:child_process';
const OPS=new Set(['welch','permutation','sample_size','next_experiment']);
export function discovery(req){
 if(!req||typeof req!=='object'||!OPS.has(req.operation))return Promise.resolve({ok:false,error:'Unsupported discovery operation'});
 const payload=JSON.stringify(req);
 if(payload.length>1000000)return Promise.resolve({ok:false,error:'Request exceeds 1MB'});
 const py=sciencePython();
 return new Promise(resolve=>{
  const child=spawn(py,['src/discovery_engine.py'],{cwd:process.cwd(),stdio:['pipe','pipe','pipe'],windowsHide:true});
  let output='',done=false;
  const finish=result=>{if(done)return;done=true;clearTimeout(timer);resolve(result);};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish({ok:false,error:'Discovery deadline exceeded'});},12000);
  child.on('error',err=>finish({ok:false,error:err.message}));
  child.stdout.on('data',chunk=>{output+=chunk;if(output.length>250000){child.kill('SIGKILL');finish({ok:false,error:'Output limit exceeded'});}});
  child.on('close',()=>{try{finish(JSON.parse(output));}catch{finish({ok:false,error:'Discovery worker failed'});}});
  child.stdin.on('error',()=>{});child.stdin.end(payload);
 });
}
