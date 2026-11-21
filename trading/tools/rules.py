"""Merge ONLY the tradingRooms namespace into the existing deployed rules."""
import copy

def number(low=0,high=999999999):
 return {'.validate':f'newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= {low} && newData.val() <= {high}'}
def text(maximum):
 return {'.validate':f'newData.isString() && newData.val().length <= {maximum}'}
def obj(fields):
 return {'.validate':"newData.hasChildren("+str(list(fields)).replace("'",'"')+")",**fields,'$other':{'.validate':False}}
def add_trading_rules(existing):
 d=copy.deepcopy(existing)
 prices=obj({k:number(60,160) for k in ['blue','gold','red']})
 volumes=obj({k:obj({'buy':number(0,36),'sell':number(0,36)}) for k in ['blue','gold','red']})
 trend_value=number(60,160);trend_value['.validate']+=" && $i.matches(/^(0|[1-9]|10)$/)"
 trends=obj({k:{'.validate':"newData.hasChild('0')",'$i':copy.deepcopy(trend_value)} for k in ['blue','gold','red']})
 player=obj({'id':{'.validate':"newData.isString() && newData.val().matches(/^(0[1-9]|1[0-2])$/)"},'name':text(20),'cash':number(),'netWorth':number(),'rank':number(1,12)})
 player['.validate']+=" && $i.matches(/^(0|[1-9]|1[01])$/)"
 public=obj({'title':text(30),'completedRound':number(0,10),'nextRound':number(1,10),'totalRounds':number(6,10),'status':{'.validate':"newData.val() === 'waiting' || newData.val() === 'finished'"},'prices':prices,'volumes':volumes,'trends':trends,'ranking':{'.validate':"newData.hasChildren(['0','1'])",'$i':player},'updatedAt':number(0,9999999999999)})
 public['.read']=True
 room=obj({'owner':text(128),'revision':number(1),'lastOp':{'.validate':"newData.isString() && newData.val().matches(/^[a-f0-9]{32}$/)"},'privateState':text(250000),'public':public})
 room['.read']="auth != null && data.child('owner').val() === auth.uid"
 room['.write']="auth != null && $room.matches(/^[a-f0-9]{32}$/) && ((!newData.exists() && data.child('owner').val() === auth.uid) || (!data.exists() && newData.child('owner').val() === auth.uid) || (data.child('owner').val() === auth.uid && newData.child('owner').val() === auth.uid))"
 room['.validate']+=" && ((!data.exists() && newData.child('revision').val() === 1) || (newData.child('revision').val() === data.child('revision').val()+1 && newData.child('lastOp').val() !== data.child('lastOp').val()))"
 d['rules']['tradingRooms']={'$room':room}
 return d
