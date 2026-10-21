#!/usr/bin/env python3
"""Isolated mathematical evaluator. No eval, exec or SymPy string parser."""
import ast, json, math, sys
try:
 import sympy as s
except ImportError:
 print(json.dumps({'ok':False,'error':'SymPy missing. Install: python -m pip install sympy'}));sys.exit(0)

SYMS={x:s.Symbol(x,real=True) for x in ('x','y','z','t','a','b','c')}
CONSTS={'pi':s.pi,'E':s.E}
FUNCS={'sin':s.sin,'cos':s.cos,'tan':s.tan,'sqrt':s.sqrt,'log':s.log,'ln':s.log,'exp':s.exp,'abs':s.Abs,'asin':s.asin,'acos':s.acos,'atan':s.atan}
MAX_NODES=120

def expr(source):
 if not isinstance(source,str) or len(source)>350:raise ValueError('Expression too long or invalid')
 source=source.replace('^','**')
 tree=ast.parse(source,mode='eval')
 if sum(1 for _ in ast.walk(tree))>MAX_NODES:raise ValueError('Expression too complex')
 def parse(n):
  if isinstance(n,ast.Constant) and type(n.value) in (int,float):
   if abs(n.value)>1e12:raise ValueError('Constant too large')
   return s.Integer(n.value) if isinstance(n.value,int) else s.Float(n.value)
  if isinstance(n,ast.Name) and n.id in SYMS|CONSTS:return (SYMS|CONSTS)[n.id]
  if isinstance(n,ast.UnaryOp) and type(n.op) in (ast.UAdd,ast.USub):
   val=parse(n.operand);return val if isinstance(n.op,ast.UAdd) else -val
  if isinstance(n,ast.BinOp) and type(n.op) in (ast.Add,ast.Sub,ast.Mult,ast.Div,ast.Pow):
   l,r=parse(n.left),parse(n.right)
   if isinstance(n.op,ast.Pow):
    if not r.is_number or abs(float(r))>30:raise ValueError('Exponent out of bounds')
    return l**r
   if isinstance(n.op,ast.Div):
    if r==0:raise ValueError('Division by zero')
    return l/r
   if isinstance(n.op,ast.Add):return l+r
   if isinstance(n.op,ast.Sub):return l-r
   return l*r
  if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id in FUNCS and not n.keywords and len(n.args)==1:
   return FUNCS[n.func.id](parse(n.args[0]))
  raise ValueError('Unsupported expression construct')
 return parse(tree.body)

def handle(req):
 op=req.get('operation'); value=req.get('expression',''); variable=req.get('variable','x')
 if variable not in SYMS:raise ValueError('Unsupported variable')
 x=SYMS[variable]
 if op=='matrix':
  mat=req.get('matrix')
  if not isinstance(mat,list) or not 1<=len(mat)<=8 or not all(isinstance(r,list) and len(r)==len(mat) for r in mat):raise ValueError('Square matrix (1-8) required')
  m=s.Matrix([[expr(str(e)) for e in row] for row in mat]);return {'determinant':str(m.det()),'rank':m.rank(),'inverse':str(m.inv()) if m.det()!=0 else None}
 if op=='solve':
  lhs,rhs=value.split('=',1) if '=' in value else (value,'0')
  f=expr(lhs)-expr(rhs)
  solutions=s.solve(f,x)
  if len(solutions)>30:raise ValueError('Too many solutions')
  return {'variable':variable,'solutions':[str(a) for a in solutions]}
 f=expr(value)
 if op=='calculate':
  if f.free_symbols:raise ValueError('Variables need substitution or equation solving')
  result=s.N(f,30)
  if result.is_finite is False:raise ValueError('Non-finite result')
  return {'exact':str(s.simplify(f)),'decimal':str(result)}
 if op=='simplify':return {'result':str(s.simplify(f))}
 if op=='factor':return {'result':str(s.factor(f))}
 if op=='differentiate':return {'result':str(s.diff(f,x))}
 if op=='integrate':return {'result':str(s.integrate(f,x))+' + C'}
 if op=='solve':
  lhs,rhs=(value.split('=',1)+['0'])[:2] if '=' in value else (value,'0')
  f=expr(lhs)-expr(rhs)
  solutions=s.solve(f,x)
  if len(solutions)>30:raise ValueError('Too many solutions')
  return {'variable':variable,'solutions':[str(a) for a in solutions]}
 raise ValueError('Unsupported operation')

try:
 req=json.loads(sys.stdin.read(4096)); result=handle(req)
 print(json.dumps({'ok':True,'operation':req.get('operation'),'result':result}))
except Exception as e:print(json.dumps({'ok':False,'error':str(e)[:250]}))
