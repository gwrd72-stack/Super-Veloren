#!/usr/bin/env python3
"""Bounded scientific numerical tasks. Models are illustrative, not experimental validation."""
import json,sys,math
import numpy as np
from scipy.integrate import solve_ivp,quad
from scipy.optimize import minimize_scalar,brentq
from scipy.constants import c,epsilon_0,mu_0,G

def scalar(x, name, lo=-1e12,hi=1e12):
    if isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) or not lo<=x<=hi: raise ValueError('Invalid '+name)
    return float(x)
def vec(x,name,maxn=30):
    if not isinstance(x,list) or not 1<=len(x)<=maxn: raise ValueError('Invalid '+name)
    return [scalar(v,name) for v in x]
def run(r):
    op=r.get('operation'); p=r.get('parameters',{})
    if not isinstance(p,dict):raise ValueError('parameters must be object')
    if op=='eigen':
        rows=p.get('matrix');
        if not isinstance(rows,list) or not 1<=len(rows)<=12 or any(not isinstance(row,list) or len(row)!=len(rows) for row in rows):raise ValueError('Square matrix of order <=12 required')
        a=np.array([[scalar(v,'matrix') for v in row] for row in rows]);vals=np.linalg.eigvals(a)
        return {'eigenvalues':[{'real':float(v.real),'imag':float(v.imag)} for v in vals], 'trace':float(np.trace(a)),'determinant':float(np.linalg.det(a)),'interpretation':'Numerically computed eigenvalues; consult conditioning for near-degenerate matrices.'}
    if op=='integral':
        # deliberately bounded polynomial integration, not arbitrary executable functions
        coeff=vec(p.get('coefficients'), 'coefficients',20);a=scalar(p.get('a'),'a',-1e3,1e3);b=scalar(p.get('b'),'b',-1e3,1e3)
        result,error=quad(lambda x: np.polynomial.polynomial.polyval(x,coeff),a,b,epsabs=1e-10)
        exact=sum(v*(b**(i+1)-a**(i+1))/(i+1) for i,v in enumerate(coeff))
        return {'integral':float(result),'quadrature_error_estimate':float(error),'analytic_polynomial_integral':float(exact),'agreement_absolute':float(abs(result-exact))}
    if op=='optimize':
        # minimize a convex quadratic: a*x*x+b*x+d
        a=scalar(p.get('a'),'a',1e-12,1e9);b=scalar(p.get('b'),'b');d=scalar(p.get('d',0),'d');lo=scalar(p.get('lower'),'lower');hi=scalar(p.get('upper'),'upper')
        if hi<=lo:raise ValueError('upper must exceed lower')
        r=minimize_scalar(lambda x:a*x*x+b*x+d,bounds=(lo,hi),method='bounded',options={'xatol':1e-11})
        x=max(lo,min(hi,-b/(2*a)))
        return {'minimum_x':float(x),'minimum_value':float(a*x*x+b*x+d),'solver_x':float(r.x),'difference':float(abs(x-r.x)),'constraint':'convex quadratic, bounded interval'}
    if op=='orbit':
        mass=scalar(p.get('central_mass_kg'),'central_mass_kg',1e5,1e33);radius=scalar(p.get('radius_m'),'radius_m',1,1e13)
        mu=G*mass;velocity=math.sqrt(mu/radius);period=2*math.pi*math.sqrt(radius**3/mu)
        return {'circular_speed_m_s':velocity,'period_s':period,'specific_energy_j_kg':-mu/(2*radius),'acceleration_m_s2':mu/radius**2,'assumptions':'Newtonian two-body circular orbit; no drag, oblateness, perturbations or relativity'}
    if op=='em_wave':
        frequency=scalar(p.get('frequency_hz'),'frequency_hz',1e-9,1e19);efield=scalar(p.get('electric_field_v_m'),'electric_field_v_m',0,1e12)
        return {'wavelength_m':c/frequency,'magnetic_field_t':efield/c,'mean_intensity_w_m2':.5*epsilon_0*c*efield**2,'vacuum_impedance_ohm':math.sqrt(mu_0/epsilon_0),'assumptions':'Plane sinusoidal EM wave in vacuum; E is peak field amplitude'}
    if op=='decay':
        rate=scalar(p.get('rate_s'),'rate_s',0,100);initial=scalar(p.get('initial'),'initial',0,1e12);time=scalar(p.get('time_s'),'time_s',0,1e6)
        sol=solve_ivp(lambda t,y:[-rate*y[0]],(0,time),[initial],rtol=1e-10,atol=1e-12)
        analytical=initial*math.exp(-rate*time);numerical=float(sol.y[0,-1]);return {'numeric':numerical,'analytic':analytical,'absolute_error':abs(numerical-analytical),'assumptions':'Constant decay rate'}
    raise ValueError('Unsupported operation')
try:
    request=json.loads(sys.stdin.read(50000))
    if not isinstance(request,dict):raise ValueError('Request must be object')
    data=run(request)
    print(json.dumps({'ok':True,'operation':request.get('operation'),'result':data},allow_nan=False))
except Exception as e: print(json.dumps({'ok':False,'error':str(e)[:220]}))
