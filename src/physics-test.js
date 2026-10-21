import assert from 'node:assert/strict';
import {physics} from './physics.js';
const run=async a=>{const r=await physics(a);assert.equal(r.ok,true,JSON.stringify(r));return r.result;};
let n=0;
const near=(a,b,tol=1e-6)=>{assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);n++;};
let r=await run({operation:'projectile',speed_m_s:10,angle_deg:45,gravity_m_s2:10,initial_height_m:0});
near(r.range_m,10,1e-10);near(r.flight_duration_s,Math.sqrt(2),1e-10);
r=await run({operation:'oscillator',mass_kg:1,spring_n_per_m:4,duration_s:Math.PI,points:101});
near(r.displacement_m.at(-1),1,1e-6);near(r.mechanical_energy_j.at(-1),2,1e-6);
r=await run({operation:'rlc',resistance_ohm:0,inductance_h:1,capacitance_f:1,initial_capacitor_voltage_v:2,duration_s:2});
near(r.stored_energy_j.at(-1),2,1e-6);
r=await run({operation:'inverse_square',source_strength:100,distances_m:[1,2,10]});near(r.values[1],25);
r=await run({operation:'resonance',mass_kg:1,spring_n_per_m:4,damping_n_s_per_m:1,forcing_amplitude_n:2,frequencies_hz:[0]});near(r.displacement_amplitudes_m[0],0.5);
for(const input of [{operation:'oscillator',mass_kg:-1,spring_n_per_m:2,duration_s:1},{operation:'inverse_square',source_strength:1,distances_m:[0]},{operation:'resonance',mass_kg:1,spring_n_per_m:1,damping_n_s_per_m:0,forcing_amplitude_n:1,frequencies_hz:[0]},{operation:'unknown'}]){
 const bad=await physics(input);assert.equal(bad.ok,false);n++;
}
console.log(`${n} physics assertions passed`);
