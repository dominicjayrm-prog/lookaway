'use client';
import React from 'react';
import type { SceneObject } from '@/lib/types';
import { getObjectById } from '@/data/objectLibrary';

interface SceneCanvasProps { objects: SceneObject[]; width?: number; height?: number; showGrid?: boolean; }

function Shape({ obj, px }: { obj: SceneObject; px: number }) {
  const libItem = getObjectById(obj.type);
  if (libItem) return libItem.render(obj.color, px);
  // Fallback
  return <div style={{ width: px, height: px, borderRadius: '50%', backgroundColor: obj.color }} />;
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
