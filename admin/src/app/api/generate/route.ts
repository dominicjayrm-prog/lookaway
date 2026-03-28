import { supabase } from '@/lib/supabase';

const COLORS = ['#FF6B6B','#0984E3','#00B894','#F9CA24','#6C5CE7','#E17055'];
const CN: Record<string,string> = {'#FF6B6B':'red','#0984E3':'blue','#00B894':'green','#F9CA24':'yellow','#6C5CE7':'purple','#E17055':'orange'};
const SHAPES = ['circle','square','triangle','star','diamond'];
const WEEKDAY_MODES: Record<number,string> = {0:'classic',1:'classic',2:'speed',3:'classic',4:'spot_the_change',5:'classic',6:'speed'};

function rng(seed: number) { let s=seed|0; return ()=>{ s=(s+0x6d2b79f5)|0; let t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
function toSeed(d: string) { let h=0; for(let i=0;i<d.length;i++) h=(h*31+d.charCodeAt(i))|0; return Math.abs(h); }
function pick<T>(a: T[], r: ()=>number): T { return a[Math.floor(r()*a.length)]; }
function shuf<T>(a: T[], r: ()=>number): T[] { for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function dist(x:number,y:number,e:{x:number;y:number}[]) { return e.every(o=>Math.hypot(x-o.x,y-o.y)>=15); }

function genObjs(n:number, r:()=>number, prefix:string) {
  const o: any[]=[]; const uc=shuf([...COLORS],r).slice(0,Math.min(n,6)); const us=shuf([...SHAPES],r).slice(0,Math.max(2,Math.min(n,5)));
  for(let i=0;i<n;i++){ let x:number,y:number,a=0; do{x=10+r()*80;y=10+r()*80;a++;}while(!dist(x,y,o)&&a<50);
    o.push({id:`${prefix}-o${i}`,type:us[i%us.length],color:uc[i%uc.length],x:Math.round(x),y:Math.round(y),size:24+Math.floor(r()*22),zIndex:i}); } return o;
}

function genQ(objs: any[], r: ()=>number, prefix: string, count: number) {
  const qs: any[] = [];
  function mk(correct:string,d:string[]){const u=[...new Set(d.filter(x=>x!==correct))];while(u.length<3)u.push(correct+'?');const opts=[correct,u[0],u[1],u[2]];const idx=[0,1,2,3];shuf(idx,r);return{options:idx.map(i=>opts[i]),correctIndex:idx.indexOf(0)};}
  const cats = ['count','color','position','comparison','presence'];
  for(let qi=0;qi<count;qi++){
    const cat = cats[qi%cats.length];
    if(cat==='count'){ const cc:Record<string,number>={}; for(const o of objs)cc[o.color]=(cc[o.color]||0)+1; const tc=pick(Object.keys(cc),r); const cn=CN[tc]||tc; const c=cc[tc]; const {options,correctIndex}=mk(String(c),[String(c+1),String(Math.max(0,c-1)),String(c+2)]); qs.push({id:`${prefix}-q${qi}`,text:`How many ${cn} shapes were there?`,options,correctIndex,category:'count',timeLimit:8}); }
    else if(cat==='color'){ const st=[...new Set(objs.map((o:any)=>o.type))]; const ts=pick(st,r); const sot=objs.filter((o:any)=>o.type===ts); const to2=pick(sot,r); const ccn=CN[to2.color]||to2.color; const d=Object.values(CN).filter(c=>c!==ccn); shuf(d,r); const {options,correctIndex}=mk(ccn,d.slice(0,3)); qs.push({id:`${prefix}-q${qi}`,text:`What colour was the ${ts}?`,options,correctIndex,category:'color',timeLimit:8}); }
    else if(cat==='position'){ const to3=pick(objs,r); const area=to3.y<40?(to3.x<50?'top-left':'top-right'):(to3.y>60?(to3.x<50?'bottom-left':'bottom-right'):'centre'); const cd=`${CN[to3.color]||to3.color} ${to3.type}`; const d2=objs.filter((o:any)=>o.id!==to3.id).map((o:any)=>`${CN[o.color]||o.color} ${o.type}`); shuf(d2,r); while(d2.length<3)d2.push(`${pick(Object.values(CN),r)} ${pick(SHAPES,r)}`); const {options,correctIndex}=mk(cd,d2.slice(0,3)); qs.push({id:`${prefix}-q${qi}`,text:`Which object was in the ${area} area?`,options,correctIndex,category:'position',timeLimit:8}); }
    else if(cat==='comparison'){ const t=objs.length; const {options,correctIndex}=mk(String(t),[String(t+1),String(t-1),String(t+2)]); qs.push({id:`${prefix}-q${qi}`,text:'How many objects were there in total?',options,correctIndex,category:'comparison',timeLimit:8}); }
    else { const ps=[...new Set(objs.map((o:any)=>o.type))]; const abs=SHAPES.filter(s=>!ps.includes(s)); if(abs.length>0&&r()>0.4){ const as2=pick(abs,r); const {options,correctIndex}=mk('No',['Yes','Maybe','Two of them']); qs.push({id:`${prefix}-q${qi}`,text:`Was there a ${as2} in the scene?`,options,correctIndex,category:'presence',timeLimit:8}); } else { const ts2=pick(ps,r); const c2=objs.filter((o:any)=>o.type===ts2).length; const {options,correctIndex}=mk(String(c2),[String(c2+1),String(Math.max(0,c2-1)),String(c2+2)]); qs.push({id:`${prefix}-q${qi}`,text:`How many ${ts2}s were there?`,options,correctIndex,category:'presence',timeLimit:8}); } }
  }
  return qs;
}

function generateClassic(dateStr: string, difficulty: string) {
  const r2 = rng(toSeed(`classic-${dateStr}-${Date.now()}`));
  const viewTimes = difficulty==='easy'?[5,5,4.5,4.5,4]:difficulty==='hard'?[4,3.5,3.5,3,3]:[5,4.5,4,3.5,3];
  const objCounts = difficulty==='easy'?[4,5,5,6,5]:difficulty==='hard'?[6,7,7,8,6]:[5,6,7,7,5];
  const scenes = []; for(let i=0;i<5;i++){ const objs=genObjs(objCounts[i],r2,`s${i}`); scenes.push({id:`scene-${i}`,viewTime:viewTimes[i],objects:objs,questions:genQ(objs,r2,`s${i}`,5)}); }
  return {mode:'classic',scenes};
}

function generateSpeed(dateStr: string) {
  const r2 = rng(toSeed(`speed-${dateStr}-${Date.now()}`));
  const scenes = []; for(let i=0;i<10;i++){ const n=4+(r2()>0.5?1:0); const objs=genObjs(n,r2,`sp${i}`); const q=genQ(objs,r2,`sp${i}`,1)[0]; scenes.push({id:`speed-${i}`,viewTime:2,objects:objs,question:q}); }
  return {mode:'speed',scenes};
}

function generateSpot(dateStr: string) {
  const r2 = rng(toSeed(`spot-${dateStr}-${Date.now()}`));
  const types = ['color_change','position_change','removed','added','shape_change'];
  const rounds = types.map((changeType, ri) => {
    const n=5+Math.floor(r2()*3); const orig=genObjs(n,r2,`spot${ri}`);
    const mod=JSON.parse(JSON.stringify(orig));
    let desc='',tx=50,ty=50;
    const idx=Math.floor(r2()*mod.length); const t=mod[idx];
    if(changeType==='color_change'){const old=t.color;let nc:string;do{nc=pick(COLORS,r2);}while(nc===old);t.color=nc;desc=`The ${CN[old]||'unknown'} ${t.type} turned ${CN[nc]||'unknown'}`;tx=t.x;ty=t.y;}
    else if(changeType==='position_change'){t.x=Math.round(10+r2()*80);t.y=Math.round(10+r2()*80);desc=`The ${CN[t.color]||'unknown'} ${t.type} moved`;tx=t.x;ty=t.y;}
    else if(changeType==='removed'){desc=`The ${CN[t.color]||'unknown'} ${t.type} disappeared`;tx=t.x;ty=t.y;mod.splice(idx,1);}
    else if(changeType==='added'){let x:number,y:number,a=0;do{x=10+r2()*80;y=10+r2()*80;a++;}while(!dist(x,y,mod)&&a<50);const c=pick(COLORS,r2);const s=pick(SHAPES,r2);const no={id:`spot${ri}-new`,type:s,color:c,x:Math.round(x),y:Math.round(y),size:28+Math.floor(r2()*16),zIndex:mod.length};mod.push(no);desc=`A ${CN[c]||'unknown'} ${s} was added`;tx=no.x;ty=no.y;}
    else{const old=t.type;let ns:string;do{ns=pick(SHAPES,r2);}while(ns===old);t.type=ns;desc=`The ${CN[t.color]||'unknown'} ${old} became a ${ns}`;tx=t.x;ty=t.y;}
    return {id:`round-${ri}`,viewTime:4,originalScene:{objects:orig},modifiedScene:{objects:mod},change:{type:changeType,objectId:t.id,description:desc,targetArea:{x:tx,y:ty,radius:15}}};
  });
  return {mode:'spot_the_change',rounds};
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, mode: requestedMode, difficulty = 'medium' } = body;
    if (!date) return Response.json({ error: 'date is required' }, { status: 400 });

    const d = new Date(date + 'T00:00:00Z');
    const mode = requestedMode || WEEKDAY_MODES[d.getUTCDay()] || 'classic';

    let sceneData: any;
    if (mode === 'classic') sceneData = generateClassic(date, difficulty);
    else if (mode === 'speed') sceneData = generateSpeed(date);
    else sceneData = generateSpot(date);

    const { data, error } = await supabase.from('daily_challenges').upsert({
      challenge_date: date, mode, scene_data: sceneData, status: 'pending_review', difficulty
    }, { onConflict: 'challenge_date' }).select().single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ challenge: data, scene_data: sceneData });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
