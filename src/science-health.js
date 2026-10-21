import { spawn } from 'node:child_process';
import { sciencePython } from './python-runtime.js';
export function scienceHealth(){
 return new Promise(resolve=>{
  const py= sciencePython(); const child=spawn(py,['-c','import json,numpy,scipy,sympy; print(json.dumps({"numpy":numpy.__version__,"scipy":scipy.__version__,"sympy":sympy.__version__}))'],{windowsHide:true});
  let stdout='',stderr='',done=false;
  const finish=v=>{if(done)return;done=true;clearTimeout(timer);resolve(v)};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish({ok:false,error:'Python health check timed out'})},12000);
  child.stdout.on('data',b=>stdout+=String(b).slice(0,2000));
  child.stderr.on('data',b=>stderr+=String(b).slice(0,2000));
  child.on('error',e=>finish({ok:false,error:'Python unavailable: '+e.message}));
  child.on('close',code=>{try {if(code!==0) throw new Error(stderr.trim()||`Python exited ${code}`);finish({ok:true,packages:JSON.parse(stdout.trim())})}catch(e){finish({ok:false,error:e.message.slice(0,300)})}});
 });
}
