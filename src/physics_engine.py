#!/usr/bin/env python3
"""Super Vel physics models: explicitly bounded standard equations, not claims of novel physics."""
import json, math, sys
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq

def real(r,key,lo,hi,default=None):
    v=r.get(key,default)
    if type(v) not in (float,int) or not math.isfinite(v) or not lo<=v<=hi:
        raise ValueError(f'{key} must be finite, in range [{lo}, {hi}]')
    return float(v)

def time_grid(r):
    duration=real(r,'duration_s',0.000001,3600)
    count=int(real(r,'points',10,2000,201))
    return np.linspace(0,duration,count)

def pack(arr):
    if not np.all(np.isfinite(arr)):raise ValueError('Non-finite model output')
    return [float(x) for x in arr]

def run(r):
    op=r.get('operation')
    if op=='oscillator':
        mass=real(r,'mass_kg',1e-9,1e9)
        spring=real(r,'spring_n_per_m',0,1e12)
        damping=real(r,'damping_n_s_per_m',0,1e9,0)
        x0=real(r,'initial_displacement_m',-1e6,1e6,1)
        v0=real(r,'initial_velocity_m_s',-1e6,1e6,0)
        t=time_grid(r)
        def fun(_,y):return [y[1],-(spring*y[0]+damping*y[1])/mass]
        sol=solve_ivp(fun,(0,float(t[-1])),[x0,v0],t_eval=t,rtol=1e-9,atol=1e-11)
        if not sol.success:raise ValueError('Solver did not converge')
        x,v=sol.y
        energy=.5*mass*v**2+.5*spring*x**2
        return {'model':'m*x_2dot+c*x_dot+k*x=0','times_s':pack(t),'displacement_m':pack(x),'velocity_m_s':pack(v),'mechanical_energy_j':pack(energy),'natural_frequency_hz':math.sqrt(spring/mass)/(2*math.pi),'caution':'Linear spring, constant parameters, no external forcing; simulated values are not measurements.'}
    if op=='rlc':
        resistance=real(r,'resistance_ohm',0,1e9)
        inductance=real(r,'inductance_h',1e-12,1e9)
        capacitance=real(r,'capacitance_f',1e-15,1e4)
        voltage=real(r,'initial_capacitor_voltage_v',-1e6,1e6,1)
        current=real(r,'initial_current_a',-1e6,1e6,0)
        t=time_grid(r)
        # state charge, current. L di/dt + R i + q/C = 0.
        def fun(_,y):return [y[1],-(resistance*y[1]+y[0]/capacitance)/inductance]
        sol=solve_ivp(fun,(0,float(t[-1])),[capacitance*voltage,current],t_eval=t,rtol=1e-9,atol=1e-11)
        if not sol.success:raise ValueError('Solver did not converge')
        q,i=sol.y
        energy=q*q/(2*capacitance)+.5*inductance*i*i
        return {'model':'series RLC free response, L*i_dot+R*i+q/C=0','times_s':pack(t),'capacitor_voltage_v':pack(q/capacitance),'current_a':pack(i),'stored_energy_j':pack(energy),'undamped_resonance_hz':1/(2*math.pi*math.sqrt(inductance*capacitance)),'caution':'Ideal lumped-element RLC; ignores component tolerances, parasitics, nonlinearities and source loading.'}
    if op=='projectile':
        speed=real(r,'speed_m_s',0,1e7)
        angle=real(r,'angle_deg',-90,90)
        gravity=real(r,'gravity_m_s2',1e-9,100)
        height=real(r,'initial_height_m',0,1e7,0)
        a=math.radians(angle);vx=speed*math.cos(a);vy=speed*math.sin(a)
        flight=(vy+math.sqrt(vy*vy+2*gravity*height))/gravity
        points=int(real(r,'points',10,2000,101))
        t=np.linspace(0,flight,points)
        return {'model':'ballistic trajectory without air resistance','times_s':pack(t),'x_m':pack(vx*t),'y_m':pack(np.maximum(0,height+vy*t-.5*gravity*t*t)),'flight_duration_s':flight,'range_m':vx*flight,'maximum_height_m':height+max(vy,0)**2/(2*gravity),'caution':'No drag, lift, spin or atmospheric variation.'}
    if op=='inverse_square':
        strength=real(r,'source_strength',-1e12,1e12)
        distances=r.get('distances_m')
        if not isinstance(distances,list) or not 1<=len(distances)<=2000:raise ValueError('distances_m must contain 1..2000 values')
        ds=[float(x) for x in distances if type(x) in (int,float) and math.isfinite(x) and 1e-9<=x<=1e12]
        if len(ds)!=len(distances):raise ValueError('Distances must be finite positive numbers')
        return {'model':'generic ideal 1/r^2 scaling','distances_m':ds,'values':[strength/(d*d) for d in ds],'caution':'Source strength is user-defined; this is not a validated field or force law for a proposed device.'}
    if op=='resonance':
        mass=real(r,'mass_kg',1e-9,1e9);spring=real(r,'spring_n_per_m',1e-12,1e12)
        damping=real(r,'damping_n_s_per_m',1e-9,1e9)
        force=real(r,'forcing_amplitude_n',0,1e9)
        freqs=r.get('frequencies_hz')
        if not isinstance(freqs,list) or not 1<=len(freqs)<=1000:raise ValueError('Need 1..1000 frequencies')
        frequencies=np.asarray(freqs,dtype=float)
        if not np.all(np.isfinite(frequencies)) or np.any(frequencies<0) or np.any(frequencies>1e8):raise ValueError('Invalid frequencies')
        omega=2*np.pi*frequencies
        amps=force/np.sqrt((spring-mass*omega**2)**2+(damping*omega)**2)
        return {'model':'steady-state forced damped oscillator','frequencies_hz':pack(frequencies),'displacement_amplitudes_m':pack(amps),'natural_frequency_hz':math.sqrt(spring/mass)/(2*math.pi),'caution':'A response peak does not imply anomalous energy production; forcing and dissipation are explicitly modeled.'}
    raise ValueError('Unknown physics operation')

try:
    request=json.loads(sys.stdin.read(150000))
    if not isinstance(request,dict):raise ValueError('JSON object required')
    result=run(request)
    print(json.dumps({'ok':True,'operation':request.get('operation'),'result':result},allow_nan=False))
except Exception as exc:
    print(json.dumps({'ok':False,'error':str(exc)[:250]}))
