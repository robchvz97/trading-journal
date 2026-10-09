#!/usr/bin/env python3
"""Regenera data.json desde ../journal/trades.csv (stdlib only).
Uso: python3 gen_data.py [ruta_csv] [--copy-charts]
Horas: servidor MT5 GMT+3 -> hora CDMX = servidor - 9h.
Conserva los campos 'motivo' y 'pensaba' existentes en data.json."""
import csv, json, os, sys, shutil, datetime as dt
HERE=os.path.dirname(os.path.abspath(__file__))
CSV=next((a for a in sys.argv[1:] if not a.startswith('--')), os.path.join(HERE,'..','journal','trades.csv'))
CHARTS=os.path.join(os.path.dirname(os.path.abspath(CSV)),'charts')
START=25000.0; SHIFT=dt.timedelta(hours=9)
OUT=os.path.join(HERE,'data.json')
old={}
if os.path.exists(OUT):
    for t in json.load(open(OUT)).get('trades',[]): old[str(t['ticket'])]=t
P=lambda s: dt.datetime.strptime(s,'%Y-%m-%d %H:%M:%S')
trades=[]
for r in csv.DictReader(open(CSV)):
    o=P(r['open_time'])-SHIFT; c=P(r['close_time'])-SHIFT
    op,sl,tp,cp=(float(r[k]) for k in('open_price','sl','tp','close_price'))
    sg=1 if r['type']=='buy' else -1; pip=0.01 if 'JPY' in r['symbol'] else 0.0001
    risk=(op-sl)*sg; rew=(tp-op)*sg
    net=round(float(r['profit'])+float(r['commission']),2)
    s=int((c-o).total_seconds()); tk=r['ticket']
    img=f'assets/charts/{tk}.png'
    if '--copy-charts' in sys.argv:
        for f in (f'{tk}.png',f'thumb_{tk}.png'):
            if os.path.exists(os.path.join(CHARTS,f)): shutil.copy(os.path.join(CHARTS,f),os.path.join(HERE,'assets','charts',f))
    trades.append(dict(ticket=int(tk),symbol=r['symbol'],type=r['type'],volume=float(r['volume']),
        open_srv=r['open_time'].replace('-','.'),close_srv=r['close_time'].replace('-','.'),date_srv=r['close_time'][:10],
        open_mx=o.strftime('%Y-%m-%dT%H:%M:%S'),close_mx=c.strftime('%Y-%m-%dT%H:%M:%S'),date=o.strftime('%Y-%m-%d'),
        open_price=op,sl=sl,tp=tp,close_price=cp,digits=3 if 'JPY' in r['symbol'] else 5,
        commission=float(r['commission']),profit=float(r['profit']),net=net,
        pips=round((cp-op)*sg/pip,1),rr=round(rew/risk,2) if risk>0 else None,
        duration=f'{s//3600}h {s%3600//60:02d}m',
        image=img if os.path.exists(os.path.join(HERE,img)) else None,
        thumb=f'assets/charts/thumb_{tk}.png' if os.path.exists(os.path.join(HERE,'assets','charts',f'thumb_{tk}.png')) else None,
        motivo=old.get(tk,{}).get('motivo',''),pensaba=old.get(tk,{}).get('pensaba','')))
trades.sort(key=lambda t:t['close_srv'])
W=[t['net'] for t in trades if t['net']>0]; L=[t['net'] for t in trades if t['net']<=0]
bal=START; peak=START; mdd=0; curve=[{'label':'Inicio','balance':START}]
for t in trades:
    bal=round(bal+t['net'],2); peak=max(peak,bal); mdd=max(mdd,peak-bal)
    curve.append({'label':t['close_srv'],'profit':t['profit'],'net':t['net'],'balance':bal,'ticket':t['ticket']})
n=len(trades); net=round(sum(t['net'] for t in trades),2)
summary=dict(start=START,balance=bal,net=net,trades=n,wins=len(W),losses=len(L),
    win_rate=len(W)/n if n else 0,profit_factor=round(sum(W)/abs(sum(L)),2) if L and sum(L) else None,
    avg_win=round(sum(W)/len(W),2) if W else 0,avg_loss=round(sum(L)/len(L),2) if L else 0,
    max_dd=round(mdd,2),max_dd_pct=round(mdd/START*100,2),gross=round(sum(t['profit'] for t in trades),2),
    commission=round(sum(t['commission'] for t in trades),2),best=max(t['net'] for t in trades),worst=min(t['net'] for t in trades))
json.dump(dict(account='FundingPips 20992473',timezone='hora CDMX (UTC-6)',generated=dt.datetime.now().isoformat(timespec='seconds'),
    summary=summary,curve=curve,trades=trades),open(OUT,'w'),ensure_ascii=False,indent=1)
print(f'data.json: {n} trades, neto {net:+.2f}, balance {bal:.2f}, maxDD {mdd:.2f}')
