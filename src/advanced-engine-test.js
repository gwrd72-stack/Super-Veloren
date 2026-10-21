import assert from 'node:assert/strict';
import {advancedScience} from './advanced-engine.js';
const near=(a,b,t)=>assert.ok(Math.abs(a-b)<=t,`${a} differs from ${b}`);
const run=async(operation,parameters)=>{let r=await advancedScience({operation,parameters});assert.equal(r.ok,true,JSON.stringify(r));return r.result};
let e=await run('eigen',{matrix:[[2,0],[0,3]]});near(e.trace,5,1e-10);near(e.determinant,6,1e-10);assert.deepEqual(e.eigenvalues.map(v=>v.real).sort(),[2,3]);
let q=await run('integral',{coefficients:[0,0,3],a:0,b:2});near(q.integral,8,1e-9);near(q.analytic_polynomial_integral,8,1e-9);
let o=await run('optimize',{a:1,b:-6,d:10,lower:0,upper:10});near(o.minimum_x,3,1e-9);near(o.minimum_value,1,1e-9);
let orbit=await run('orbit',{central_mass_kg:5.9722e24,radius_m:6.771e6});assert.ok(orbit.circular_speed_m_s>7000&&orbit.circular_speed_m_s<8000);
let wave=await run('em_wave',{frequency_hz:3e8,electric_field_v_m:100});assert.ok(wave.wavelength_m>.9&&wave.wavelength_m<1.1);assert.ok(wave.mean_intensity_w_m2>0);
let d=await run('decay',{rate_s:0.2,initial:100,time_s:5});near(d.numeric,d.analytic,1e-6);
for(const payload of [{operation:'unsupported',parameters:{}},{operation:'eigen',parameters:{matrix:[[1,2],[3]]}},{operation:'orbit',parameters:{central_mass_kg:-10,radius_m:100}}]){const r=await advancedScience(payload);assert.equal(r.ok,false)}
console.log('V18 advanced scientific engine: 17 reference assertions passed');
