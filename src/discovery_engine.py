"""V12 reproducible experiment statistics; standard-library only.
JSON line input/output; no arbitrary code evaluation.
"""
import json, sys, math, statistics, random

def numeric(xs, maximum=10000):
    if not isinstance(xs,list) or not 2<=len(xs)<=maximum:
        raise ValueError('Each sample must be an array of 2–10000 numbers')
    if any(isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) or abs(x)>1e12 for x in xs):
        raise ValueError('Finite bounded numeric samples required')
    return [float(x) for x in xs]

def compare(a,b):
    a,b=numeric(a),numeric(b)
    na,nb=len(a),len(b); ma,mb=statistics.mean(a),statistics.mean(b)
    va,vb=statistics.variance(a),statistics.variance(b)
    se=math.sqrt(va/na+vb/nb)
    delta=ma-mb
    if se==0: return {'effect':delta,'standard_error':0,'t_statistic':None,'degrees_freedom':None,'ci_95_approx':None,'interpretation':'Zero estimated sampling variance: cannot estimate uncertainty from these observations.'}
    denom=(va/na)**2/(na-1)+(vb/nb)**2/(nb-1)
    df=(va/na+vb/nb)**2/denom if denom else None
    # Approximate normal CI only; explicitly labeled (not Student-t interval).
    return {'effect':delta,'standard_error':se,'t_statistic':delta/se,'degrees_freedom':df,'ci_95_approx':[delta-1.96*se,delta+1.96*se], 'interpretation':'Welch standard error; normal-approximation interval, not a p-value or causal proof.'}

def permutation(a,b,iterations,seed):
    a,b=numeric(a,500),numeric(b,500)
    if not isinstance(iterations,int) or isinstance(iterations,bool) or not 100<=iterations<=5000: raise ValueError('iterations must be integer 100–5000')
    if not isinstance(seed,int) or isinstance(seed,bool) or not 0<=seed<=2**32-1: raise ValueError('seed must be 0..2^32-1')
    obs=abs(statistics.mean(a)-statistics.mean(b)); combined=a+b
    rng=random.Random(seed); extreme=0
    for _ in range(iterations):
        shuffled=combined[:];rng.shuffle(shuffled)
        extreme+=abs(statistics.mean(shuffled[:len(a)])-statistics.mean(shuffled[len(a):]))>=obs-1e-12
    return {'absolute_mean_difference':obs,'permutation_p_value':(extreme+1)/(iterations+1),'iterations':iterations,'seed':seed,'method':'two-sided unpaired permutation test; exchangeability assumed','warning':'Small samples and selection bias can invalidate inference. A small p-value does not establish a mechanism.'}

def power_plan(effect,sd,alpha,power):
    if any(isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) for x in [effect,sd,alpha,power]):raise ValueError('Finite numeric parameters required')
    if not 0<abs(effect)<=1e9 or not 0<sd<=1e9 or not .001<=alpha<=.1 or not .6<=power<=.99: raise ValueError('Outside supported planning range')
    # Quantiles via stdlib NormalDist, approximate equal-size independent groups.
    nd=statistics.NormalDist(); z1=nd.inv_cdf(1-alpha/2);z2=nd.inv_cdf(power)
    n=math.ceil(2*((z1+z2)*sd/effect)**2)
    return {'participants_per_group_approx':n,'total_approx':2*n,'method':'normal approximation: independent equal groups, equal SD, two-sided test','assumptions':['Independent observations','Specified effect and SD are credible','No attrition, clustering, multiplicity or model misspecification accounted for']}

def next_experiment(options):
    if not isinstance(options,list) or not 1<=len(options)<=30:raise ValueError('Provide 1–30 candidate experiments')
    ranked=[]
    for idx,option in enumerate(options):
        if not isinstance(option,dict):raise ValueError('Invalid experiment')
        title=option.get('title')
        if not isinstance(title,str) or not 1<=len(title.strip())<=150:raise ValueError('Experiment title required')
        vals=[option.get(k) for k in ('information_gain','feasibility','independence','cost','risk')]
        if any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or not 0<=v<=1 for v in vals):raise ValueError('Scores must be bounded 0..1')
        info,feas,ind,cost,risk=vals
        score=round(.4*info+.25*feas+.2*ind-.1*cost-.05*risk,6)
        ranked.append({'index':idx,'title':title.strip(),'score':score,'inputs':dict(zip(('information_gain','feasibility','independence','cost','risk'),vals))})
    ranked.sort(key=lambda e:(-e['score'],e['index']))
    return {'ranked':ranked,'method':'Transparent weighted priority heuristic, not autonomous scientific judgment','warning':'Input scores are user estimates; prioritize controls, blinding and independent replication.'}

def main(req):
    operation=req.get('operation')
    if operation=='welch': return compare(req.get('group_a'),req.get('group_b'))
    if operation=='permutation': return permutation(req.get('group_a'),req.get('group_b'),req.get('iterations',1000),req.get('seed',0))
    if operation=='sample_size':return power_plan(req.get('effect'),req.get('sd'),req.get('alpha',.05),req.get('power',.8))
    if operation=='next_experiment':return next_experiment(req.get('options'))
    raise ValueError('Unknown operation')
try:
    req=json.loads(sys.stdin.read(1000001))
    if not isinstance(req,dict):raise ValueError('JSON object required')
    response={'ok':True,'result':main(req),'verification':'Reproducible deterministic numerical analysis; experimental assumptions require external validation.'}
except (ValueError,TypeError,KeyError,OverflowError,ZeroDivisionError) as e:
    response={'ok':False,'error':str(e)}
print(json.dumps(response,allow_nan=False))
