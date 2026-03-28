'use client';
import React from 'react';
import type { SceneObject } from '@/lib/types';

interface SceneCanvasProps { objects: SceneObject[]; width?: number; height?: number; showGrid?: boolean; }

function Shape({ obj, px }: { obj: SceneObject; px: number }) {
  const s = { width: px, height: px, display: 'flex', alignItems: 'center' as const, justifyContent: 'center' as const };
  switch (obj.type) {
    case 'circle': return <div style={{ ...s, borderRadius: '50%', backgroundColor: obj.color }} />;
    case 'square': return <div style={{ ...s, borderRadius: 4, backgroundColor: obj.color }} />;
    case 'triangle': return <div style={{ width: 0, height: 0, borderLeft: `${px/2}px solid transparent`, borderRight: `${px/2}px solid transparent`, borderBottom: `${px}px solid ${obj.color}` }} />;
    case 'star': return <div style={{ ...s, fontSize: px * 0.85, lineHeight: 1, color: obj.color }}>&#9733;</div>;
    case 'diamond': return <div style={{ width: px*0.7, height: px*0.7, backgroundColor: obj.color, borderRadius: 3, transform: 'rotate(45deg)' }} />;
    case 'hexagon': return <div style={{ ...s, backgroundColor: obj.color, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />;
    case 'heart': return <div style={{ ...s, fontSize: px * 0.85, lineHeight: 1, color: obj.color }}>&#9829;</div>;
    case 'number': case 'letter': return <div style={{ ...s, fontSize: px*0.55, fontWeight: 700, color: obj.color }}>{obj.label ?? '?'}</div>;
    default: return null;
  }
}

export default function SceneCanvas({ objects, width = 400, height = 400, showGrid = false }: SceneCanvasProps) {
  return (
    <div style={{ position: 'relative', width, height, backgroundColor: '#FFFFFF', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      {showGrid && [25,50,75].map(p => (<React.Fragment key={p}><div style={{ position:'absolute', left:(p/100)*width, top:0, width:1, height:'100%', backgroundColor:'rgba(0,0,0,0.06)', pointerEvents:'none' }} /><div style={{ position:'absolute', top:(p/100)*height, left:0, height:1, width:'100%', backgroundColor:'rgba(0,0,0,0.06)', pointerEvents:'none' }} /></React.Fragment>))}
      {objects.map(obj => {
        const px = obj.size * (width / 100);
        return (<div key={obj.id} style={{ position:'absolute', left:(obj.x/100)*width-px/2, top:(obj.y/100)*height-px/2, zIndex:obj.zIndex??0, transform:obj.rotation?`rotate(${obj.rotation}deg)`:undefined, display:'flex', alignItems:'center', justifyContent:'center' }}><Shape obj={obj} px={px} /></div>);
      })}
    </div>
  );
}
