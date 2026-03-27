import type { SceneObject, Question } from '@/src/types/game';
import type { SpeedScene, SpeedChallenge } from '@/src/types/daily';

const COLORS = ['#FF6B6B','#0984E3','#00B894','#F9CA24','#6C5CE7','#E17055'] as const;
const CN: Record<string,string> = {'#FF6B6B':'red','#0984E3':'blue','#00B894':'green','#F9CA24':'yellow','#6C5CE7':'purple','#E17055':'orange'};
const SHAPES = ['circle','square','triangle','star','diamond'] as const;

function rng(seed: number) { let s=seed|0; return ()=>{ s=(s+0x6d2b79f5)|0; let t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function toSeed(d: string) { let h=0x59EED; for(let i=0;i<d.length;i++) h=(h*31+d.charCodeAt(i))|0; return h; }
function pick<T>(a: readonly T[], r: ()=>number): T { return a[Math.floor(r()*a.length)]; }
function shuf<T>(a: T[], r: ()=>number): T[] { for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function dist(x:number,y:number,e:{x:number;y:number}[],m:number) { return e.every(o=>Math.hypot(x-o.x,y-o.y)>=m); }

function genObjs(n:number, r:()=>number, si:number): SceneObject[] {
  const o:SceneObject[]=[]; const uc=shuf([...COLORS],r).slice(0,Math.min(n,6)); const us=shuf([...SHAPES],r).slice(0,Math.max(2,Math.min(n,5)));
  for(let i=0;i<n;i++){ let x:number,y:number,a=0; do{x=10+r()*80;y=10+r()*80;a++;}while(!dist(x,y,o,15)&&a<50);
    o.push({id:`sp-s${si}-o${i}`,type:us[i%us.length],color:uc[i%uc.length],x:Math.round(x*10)/10,y:Math.round(y*10)/10,size:25+Math.floor(r()*18),zIndex:i}); } return o;
}

function genQ(objs:SceneObject[], r:()=>number, si:number, cat:string): Question {
  function mk(correct:string, d:string[]): {options:[string,string,string,string];correctIndex:0|1|2|3} {
    const u=[...new Set(d.filter(x=>x!==correct))]; while(u.length<3)u.push(correct+'?');
    const opts=[correct,u[0],u[1],u[2]]; const idx=[0,1,2,3]; shuf(idx,r);
    return {options:idx.map(i=>opts[i]) as [string,string,string,string], correctIndex:idx.indexOf(0) as 0|1|2|3};
  }
  if(cat==='count'){ const cc:Record<string,number>={}; for(const o of objs)cc[o.color]=(cc[o.color]||0)+1; const tc=pick(Object.keys(cc),r); const cn=CN[tc]||tc; const c=cc[tc]; const {options,correctIndex}=mk(String(c),[String(c+1),String(Math.max(0,c-1)),String(c+2)]); return {id:`sp-s${si}-q`,text:`How many ${cn} shapes?`,options,correctIndex,category:'count',timeLimit:6}; }
  if(cat==='color'){ const st=[...new Set(objs.map(o=>o.type))]; const ts=pick(st,r); const sot=objs.filter(o=>o.type===ts); const to2=pick(sot,r); const ccn=CN[to2.color]||to2.color; const d=Object.values(CN).filter(c=>c!==ccn); shuf(d,r); const {options,correctIndex}=mk(ccn,d.slice(0,3)); return {id:`sp-s${si}-q`,text:`What colour was the ${ts}?`,options,correctIndex,category:'color',timeLimit:6}; }
  const ps=[...new Set(objs.map(o=>o.type))]; const abs=[...SHAPES].filter(s=>!ps.includes(s));
  if(abs.length>0&&r()>0.4){ const as2=pick(abs,r); const {options,correctIndex}=mk('No',['Yes','Maybe','Two of them']); return {id:`sp-s${si}-q`,text:`Was there a ${as2} in the scene?`,options,correctIndex,category:'presence',timeLimit:6}; }
  const ts2=pick(ps,r); const c2=objs.filter(o=>o.type===ts2).length; const {options,correctIndex}=mk(String(c2),[String(c2+1),String(Math.max(0,c2-1)),String(c2+2)]); return {id:`sp-s${si}-q`,text:`How many ${ts2}s were there?`,options,correctIndex,category:'count',timeLimit:6};
}

export function generateSpeedChallenge(dateStr: string): SpeedChallenge {
  const r2=rng(toSeed(dateStr)); const scenes:SpeedScene[]=[]; const cats=['count','color','presence','count','color','presence','count','color','count','presence'];
  for(let i=0;i<10;i++){ const n=4+(r2()>0.5?1:0); const objs=genObjs(n,r2,i); scenes.push({id:`speed-${dateStr}-s${i}`,viewTime:2,objects:objs,question:genQ(objs,r2,i,cats[i])}); }
  return {mode:'speed',scenes};
}
