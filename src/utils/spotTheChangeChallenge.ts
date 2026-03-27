import type { SceneObject } from '@/src/types/game';
import type { SpotTheChangeChallenge, SpotRound, ChangeType } from '@/src/types/daily';

const COLORS = ['#FF6B6B','#0984E3','#00B894','#F9CA24','#6C5CE7','#E17055'] as const;
const CN: Record<string,string> = {'#FF6B6B':'red','#0984E3':'blue','#00B894':'green','#F9CA24':'yellow','#6C5CE7':'purple','#E17055':'orange'};
const SHAPES = ['circle','square','triangle','star','diamond'] as const;

function rng(seed:number){let s=seed|0;return()=>{s=(s+0x6d2b79f5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function toSeed(d:string){let h=0xABCDE;for(let i=0;i<d.length;i++)h=(h*31+d.charCodeAt(i))|0;return h;}
function pick<T>(a:readonly T[],r:()=>number):T{return a[Math.floor(r()*a.length)];}
function shuf<T>(a:T[],r:()=>number):T[]{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function dist(x:number,y:number,e:{x:number;y:number}[],m:number){return e.every(o=>Math.hypot(x-o.x,y-o.y)>=m);}

function genObjs(n:number,r:()=>number,ri:number):SceneObject[]{
  const o:SceneObject[]=[];const uc=shuf([...COLORS],r).slice(0,Math.min(n,6));const us=shuf([...SHAPES],r).slice(0,Math.max(2,Math.min(n,5)));
  for(let i=0;i<n;i++){let x:number,y:number,a=0;do{x=10+r()*80;y=10+r()*80;a++;}while(!dist(x,y,o,15)&&a<50);
    o.push({id:`spot-r${ri}-o${i}`,type:us[i%us.length],color:uc[i%uc.length],x:Math.round(x*10)/10,y:Math.round(y*10)/10,size:25+Math.floor(r()*18),zIndex:i});}return o;
}

function deepClone<T>(obj:T):T{return JSON.parse(JSON.stringify(obj));}

function genRound(r:()=>number,ri:number,changeType:ChangeType):SpotRound{
  const n=5+Math.floor(r()*3);const orig=genObjs(n,r,ri);const mod=deepClone(orig);
  let desc='';let targetX=50,targetY=50;

  if(changeType==='color_change'){
    const idx=Math.floor(r()*mod.length);const t=mod[idx];const oldC=t.color;let newC:string;do{newC=pick(COLORS,r);}while(newC===oldC);
    t.color=newC;desc=`The ${CN[oldC]||'unknown'} ${t.type} turned ${CN[newC]||'unknown'}`;targetX=t.x;targetY=t.y;
  }else if(changeType==='position_change'){
    const idx=Math.floor(r()*mod.length);const t=mod[idx];
    t.x=Math.round(10+r()*80);t.y=Math.round(10+r()*80);desc=`The ${CN[t.color]||'unknown'} ${t.type} moved`;targetX=t.x;targetY=t.y;
  }else if(changeType==='removed'){
    const idx=Math.floor(r()*mod.length);const t=mod[idx];desc=`The ${CN[t.color]||'unknown'} ${t.type} disappeared`;targetX=t.x;targetY=t.y;mod.splice(idx,1);
  }else if(changeType==='added'){
    let x:number,y:number,a=0;do{x=10+r()*80;y=10+r()*80;a++;}while(!dist(x,y,mod,15)&&a<50);
    const c=pick(COLORS,r);const s=pick(SHAPES,r);const newObj:SceneObject={id:`spot-r${ri}-new`,type:s,color:c,x:Math.round(x*10)/10,y:Math.round(y*10)/10,size:25+Math.floor(r()*18),zIndex:mod.length};
    mod.push(newObj);desc=`A ${CN[c]||'unknown'} ${s} was added`;targetX=newObj.x;targetY=newObj.y;
  }else if(changeType==='shape_change'){
    const idx=Math.floor(r()*mod.length);const t=mod[idx];const oldS=t.type;let newS:typeof SHAPES[number];do{newS=pick(SHAPES,r);}while(newS===oldS);
    t.type=newS;desc=`The ${CN[t.color]||'unknown'} ${oldS} became a ${newS}`;targetX=t.x;targetY=t.y;
  }else if(changeType==='size_change'){
    const idx=Math.floor(r()*mod.length);const t=mod[idx];const wasSmall=t.size<35;t.size=wasSmall?t.size+15:t.size-12;
    desc=`The ${CN[t.color]||'unknown'} ${t.type} ${wasSmall?'grew larger':'got smaller'}`;targetX=t.x;targetY=t.y;
  }

  return{id:`spot-r${ri}`,viewTime:4,originalScene:{objects:orig},modifiedScene:{objects:mod},change:{type:changeType,objectId:`spot-r${ri}-o0`,description:desc,targetArea:{x:targetX,y:targetY,radius:15}}};
}

export function generateSpotTheChangeChallenge(dateStr:string):SpotTheChangeChallenge{
  const r2=rng(toSeed(dateStr));const types:ChangeType[]=['color_change','position_change','removed','added','shape_change'];
  const rounds:SpotRound[]=types.map((t,i)=>genRound(r2,i,t));
  return{mode:'spot_the_change',rounds};
}
