#!/usr/bin/env python3
"""Bounded numerical research engine: no executable formulas or arbitrary file access."""
import json,sys,math
import numpy as np
from scipy import stats, signal, optimize

def series(v, minlen=3, maxlen=10000):
 if not isinstance(v,list) or not minlen<=len(v)<=maxlen: raise ValueError(f"Expected {minlen}–{maxlen} observations")
 if any(type(x) not in (int,float) or not math.isfinite(x) or abs(x)>1e12 for x in v):raise ValueError('Only finite bounded numbers supported')
 return np.array(v,dtype=float)

def run(r):
 operation=r.get('operation'); v=series(r.get('values'))
 if operation=='describe':
  sem=stats.sem(v) if len(v)>1 else float('nan'); ci=stats.t.interval(.95,len(v)-1,loc=np.mean(v),scale=sem)
  return {'sample_size':len(v),'mean':float(v.mean()),'median':float(np.median(v)),'sample_std':float(v.std(ddof=1)),'minimum':float(v.min()),'maximum':float(v.max()),'mean_95pct_confidence_interval':[float(q) for q in ci] if np.ptp(v)>0 else [float(v.mean())]*2,'caution':'Confidence interval assumes independent, representative observations.'}
 if operation=='compare':
  other=series(r.get('other'))
  test=stats.ttest_ind(v,other,equal_var=False)
  return {'group_a_mean':float(v.mean()),'group_b_mean':float(other.mean()),'mean_difference_a_minus_b':float(v.mean()-other.mean()),'welch_t':float(test.statistic),'p_value':float(test.pvalue),'caution':'P value is not the probability a hypothesis is true; assumptions and multiple testing matter.'}
 if operation=='fit':
  x=series(r.get('x'),len(v),len(v)); slope,intercept,rv,pv,se=stats.linregress(x,v)
  predicted=intercept+slope*x
  return {'model':'y = intercept + slope*x','slope':float(slope),'intercept':float(intercept),'r_squared':float(rv**2),'p_value_slope':float(pv),'rmse':float(np.sqrt(np.mean((v-predicted)**2))),'caution':'Correlation and fitted slope do not establish causation.'}
 if operation=='spectral_diagnostics':
  rate=r.get('sample_rate_hz',1)
  if type(rate) not in (int,float) or not math.isfinite(rate) or not 0<rate<=1e8:raise ValueError('Invalid sample_rate_hz')
  if len(v)<16:raise ValueError('At least 16 samples required')
  if np.ptp(v)==0:return {'constant_signal':True,'dominant_frequency_hz':None,'snr_db':None,'caution':'Constant-valued data contain no measurable oscillatory component.'}
  centered=signal.detrend(v,type='constant')
  nperseg=min(len(centered),1024)
  freqs,psd=signal.welch(centered,fs=rate,window='hann',nperseg=nperseg,noverlap=nperseg//2,scaling='density')
  positive=np.flatnonzero(freqs>0)
  if len(positive)==0:raise ValueError('Insufficient spectral resolution')
  ranked=positive[np.argsort(psd[positive])[::-1][:5]]
  idx=int(ranked[0]);peak=float(psd[idx]);background=float(np.median(psd[positive]))
  snr_db=float(10*np.log10(peak/background)) if background>0 else None
  return {'method':'Welch PSD with Hann window, mean detrending','sample_count':len(v),'sample_rate_hz':float(rate),'nyquist_hz':float(rate/2),'frequency_resolution_hz':float(freqs[1]-freqs[0]),'dominant_frequency_hz':float(freqs[idx]),'top_peak_frequencies_hz':[float(freqs[z]) for z in ranked],'peak_to_median_psd_db':snr_db,'rms':float(np.sqrt(np.mean(centered**2))),'caution':'Peak-to-median PSD is not calibrated instrument SNR; check aliasing, leakage, sensor calibration and replicate with independent equipment.'}
 if operation=='spectrum':
  rate=r.get('sample_rate_hz',1)
  if type(rate) not in (int,float) or not math.isfinite(rate) or not 0<rate<=1e8:raise ValueError('Invalid sample_rate_hz')
  if len(v)<8:raise ValueError('Spectrum needs at least 8 samples')
  centered=v-v.mean(); frequencies=np.fft.rfftfreq(len(v),1/rate); power=np.abs(np.fft.rfft(centered))**2/len(v)**2
  order=np.argsort(power[1:])[::-1][:5]+1
  return {'sampling_rate_hz':rate,'duration_seconds':len(v)/rate,'nyquist_hz':rate/2,'peak_frequencies_hz':[float(frequencies[i]) for i in order],'relative_peak_powers':[float(power[i]) for i in order],'caution':'Spectral peaks can be caused by noise, harmonics, aliasing or sensor artifacts.'}
 if operation=='montecarlo':
  trials=r.get('trials',10000); seed=r.get('seed',12345); threshold=r.get('threshold',0)
  if type(trials)!=int or not 100<=trials<=100000 or type(seed)!=int or not 0<=seed<2**32:raise ValueError('Invalid trials or seed')
  if type(threshold) not in (int,float) or not math.isfinite(threshold):raise ValueError('Invalid threshold')
  # Nonparametric bootstrap of sample mean, not speculative evidence generation.
  rng=np.random.default_rng(seed); count=0; chunks=[]
  for i in range(0,trials,1000):
   n=min(1000,trials-i); means=np.mean(rng.choice(v,size=(n,len(v)),replace=True),axis=1);chunks.append(means);count+=int(np.sum(means>threshold))
  means=np.concatenate(chunks)
  return {'method':'bootstrap of observed sample mean','trials':trials,'seed':seed,'mean_of_bootstrap_means':float(means.mean()),'95pct_bootstrap_interval':[float(z) for z in np.quantile(means,[.025,.975])],'fraction_above_threshold':count/trials,'threshold':threshold,'caution':'Bootstrap preserves limitations and biases in the supplied dataset.'}
 raise ValueError('Unsupported research operation')

try:
 payload=json.loads(sys.stdin.read(150000))
 answer=run(payload)
 if not isinstance(answer,dict):raise ValueError('Unexpected result')
 print(json.dumps({'ok':True,'operation':payload.get('operation'),'result':answer},allow_nan=False))
except Exception as ex:
 print(json.dumps({'ok':False,'error':str(ex)[:240]}))
