'use client';
import React, { useRef, useState, useCallback } from 'react';
import type { SceneObject } from '@/lib/types';

const COLORS = ['#FF6B6B','#0984E3','#00B894','#F9CA24','#6C5CE7','#E17055','#FD79A8','#00CEC9','#55EFC4','#FF7675','#2D3436','#A0522D'];

interface Props {
  objects: SceneObject[];
  onObjectsChange: (objects: SceneObject[]) => void;
  selectedId: string | null;
  onSelectObject: (id: string | null) => void;
  width?: number;
  height?: number;
  showGrid?: boolean;
}

function renderShape(type: string, color: string, size: number) {
  const px = size * 5;
  switch (type) {
    case 'circle': return <div style={{ width: px, height: px, borderRadius: '50%', backgroundColor: color }} />;
    case 'square': return <div style={{ width: px, height: px, borderRadius: 4, backgroundColor: color }} />;
    case 'triangle': return <svg width={px} height={px} viewBox="0 0 100 100"><polygon points="50,5 95,95 5,95" fill={color} /></svg>;
    case 'star': return <svg width={px} height={px} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={color} /></svg>;
    case 'diamond': return <div style={{ width: px*0.7, height: px*0.7, backgroundColor: color, borderRadius: 3, transform: 'rotate(45deg)' }} />;
    case 'hexagon': return <svg width={px} height={px} viewBox="0 0 100 100"><polygon points="50,2 93,25 93,75 50,98 7,75 7,25" fill={color} /></svg>;
    case 'heart': return <svg width={px} height={px} viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={color} /></svg>;
    default: return <svg width={px} height={px} viewBox="0 0 100 100"><path d={type.startsWith('M') ? type : ''} fill={color} /><circle cx="50" cy="50" r="45" fill={color} /></svg>;
  }
}

export default function InteractiveCanvas({ objects, onObjectsChange, selectedId, onSelectObject, width = 500, height = 500, showGrid = false }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const getCanvasPos = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, obj: SceneObject) => {
    e.stopPropagation();
    onSelectObject(obj.id);
    const pos = getCanvasPos(e);
    setDragging({ id: obj.id, offsetX: pos.x - obj.x, offsetY: pos.y - obj.y });
  }, [onSelectObject, getCanvasPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const pos = getCanvasPos(e);
    const x = Math.max(5, Math.min(95, Math.round(pos.x - dragging.offsetX)));
    const y = Math.max(5, Math.min(95, Math.round(pos.y - dragging.offsetY)));
    setDragPos({ x, y });
    onObjectsChange(objects.map(o => o.id === dragging.id ? { ...o, x, y } : o));
  }, [dragging, getCanvasPos, objects, onObjectsChange]);

  const handleMouseUp = useCallback(() => { setDragging(null); setDragPos(null); }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) onSelectObject(null);
  }, [onSelectObject]);

  const updateObj = useCallback((id: string, updates: Partial<SceneObject>) => {
    onObjectsChange(objects.map(o => o.id === id ? { ...o, ...updates } : o));
  }, [objects, onObjectsChange]);

  const deleteObj = useCallback((id: string) => {
    onObjectsChange(objects.filter(o => o.id !== id));
    onSelectObject(null);
  }, [objects, onObjectsChange, onSelectObject]);

  const duplicateObj = useCallback((id: string) => {
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    const newObj = { ...obj, id: `obj-${Date.now()}`, x: Math.min(90, obj.x + 5), y: Math.min(90, obj.y + 5) };
    onObjectsChange([...objects, newObj]);
    onSelectObject(newObj.id);
  }, [objects, onObjectsChange, onSelectObject]);

  const selectedObj = objects.find(o => o.id === selectedId);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={canvasRef} onClick={handleCanvasClick} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        style={{ position: 'relative', width, height, backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'default', userSelect: 'none' }}>
        {showGrid && [25,50,75].map(p => (<React.Fragment key={p}><div style={{ position:'absolute', left:`${p}%`, top:0, width:1, height:'100%', backgroundColor:'rgba(0,0,0,0.06)' }} /><div style={{ position:'absolute', top:`${p}%`, left:0, height:1, width:'100%', backgroundColor:'rgba(0,0,0,0.06)' }} /></React.Fragment>))}
        {objects.map(obj => {
          const px = obj.size * (width / 100);
          const isSelected = obj.id === selectedId;
          return (
            <div key={obj.id} onMouseDown={(e) => handleMouseDown(e, obj)}
              style={{ position: 'absolute', left: `${obj.x}%`, top: `${obj.y}%`, transform: 'translate(-50%, -50%)', cursor: 'grab', zIndex: obj.zIndex ?? 0, outline: isSelected ? '2px dashed #3B82F6' : 'none', outlineOffset: 4, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {renderShape(obj.type, obj.color, obj.size / 5)}
            </div>
          );
        })}
        {dragging && dragPos && <div style={{ position: 'absolute', left: `${dragPos.x}%`, top: `${dragPos.y + 5}%`, transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4, pointerEvents: 'none', zIndex: 999 }}>x: {dragPos.x}, y: {dragPos.y}</div>}
      </div>

      {selectedObj && (
        <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }} className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 flex items-center gap-3">
          <div className="flex gap-1 flex-wrap" style={{ maxWidth: 200 }}>
            {COLORS.map(c => (<button key={c} onClick={() => updateObj(selectedObj.id, { color: c })} style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: c, border: selectedObj.color === c ? '2px solid #1A1A18' : '1px solid #ddd', cursor: 'pointer' }} />))}
          </div>
          <input type="range" min={15} max={80} value={selectedObj.size} onChange={e => updateObj(selectedObj.id, { size: Number(e.target.value) })} className="w-20" />
          <button onClick={() => duplicateObj(selectedObj.id)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">Dup</button>
          <button onClick={() => deleteObj(selectedObj.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">Del</button>
        </div>
      )}
    </div>
  );
}
