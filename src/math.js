import { sciencePython } from './python-runtime.js';
import { spawn } from 'node:child_process';
const COMMANDS = ['calculate','solve','simplify','factor','differentiate','integrate','matrix'];
export function mathRequest(message) {
  const input = String(message).trim();
  const match = input.match(/^(math|calculate|solve|simplify|factor|differentiate|integrate|matrix)\s*:\s*([\s\S]+)$/i);
  if (!match) return null;
  const op = match[1].toLowerCase() === 'math' ? 'calculate' : match[1].toLowerCase();
  if (!COMMANDS.includes(op)) return null;
  let expression = match[2].trim(), variable='x', matrix;
  if (op === 'matrix') { try { matrix=JSON.parse(expression); } catch {return {operation:op,error:'Provide a JSON square matrix, e.g. matrix: [[1,2],[3,4]]'}; } }
  else {
    const varMatch = expression.match(/\s+with\s+respect\s+to\s+([a-z])$/i);
    if (varMatch) {variable=varMatch[1].toLowerCase(); expression=expression.slice(0,varMatch.index).trim();}
  }
  return {operation:op,expression,variable,...(matrix ? {matrix}: {})};
}
export async function executeMath(request) {
  if (request.error) return {ok:false,error:request.error};
  const python=sciencePython();
  return new Promise((resolve)=>{
    const child=spawn(python,['src/math_engine.py'],{cwd:process.cwd(),stdio:['pipe','pipe','pipe'],windowsHide:true});
    let stdout='',stderr='',settled=false;
    const finish=o=>{if(!settled){settled=true;clearTimeout(timer);resolve(o);}};
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish({ok:false,error:'Math operation exceeded 5 seconds'});},5000);
    child.on('error',e=>finish({ok:false,error:`Math runtime error: ${e.message}`}));
    child.stdout.on('data',b=>{stdout+=String(b);if(stdout.length>20000) child.kill('SIGKILL');});
    child.stderr.on('data',b=>{stderr+=String(b).slice(0,2000);});
    child.on('close',()=>{try{finish(JSON.parse(stdout));}catch{finish({ok:false,error:stderr||'Math engine returned invalid output'});}});
    child.stdin.end(JSON.stringify(request));
  });
}
export function formatMath(response) {
  if (!response.ok) return `Mathematical engine: ${response.error}`;
  return 'Verified symbolic/numeric tool output:\n'+JSON.stringify(response.result,null,2);
}
