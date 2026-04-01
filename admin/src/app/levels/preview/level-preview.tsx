'use client';
import { useState } from 'react';
import { getObjectById } from '@/data/objectLibrary';

interface SceneObject {
  id: string;
  type: string;
  color: string;
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  size: number;
  content?: string | null;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
  timeLimit: number;
}

export default function LevelPreview({ objects, questions }: { objects: SceneObject[]; questions: Question[]; content: any }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [showEndPositions, setShowEndPositions] = useState(false);

  const hasMovement = objects.some(o => o.endX != null || o.endY != null);
  const hasContent = objects.some(o => o.content);

  return (
    <div className="space-y-6">
      {/* Scene canvas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Scene Preview</h2>
          <div className="flex gap-2">
            {hasMovement && (
              <button
                onClick={() => setShowEndPositions(!showEndPositions)}
                className={`text-xs px-3 py-1 rounded-lg font-medium ${showEndPositions ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-slate-500 hover:bg-gray-200'}`}
              >
                {showEndPositions ? 'Show start positions' : 'Show end positions'}
              </button>
            )}
          </div>
        </div>

        <div className="w-full aspect-square bg-gray-50 rounded-xl relative overflow-hidden border border-gray-100">
          {objects.map((obj) => {
            const libItem = getObjectById(obj.type);
            const x = showEndPositions && obj.endX != null ? obj.endX : obj.x;
            const y = showEndPositions && obj.endY != null ? obj.endY : obj.y;
            const isMoving = obj.endX != null || obj.endY != null;
            const sz = Math.max(obj.size * 0.7, 20);

            return (
              <div
                key={obj.id}
                className="absolute flex items-center justify-center group"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: sz,
                  height: sz,
                }}
              >
                {libItem ? libItem.render(obj.color, sz) : (
                  <div style={{ width: sz, height: sz, borderRadius: '50%', backgroundColor: obj.color }} />
                )}
                {/* Content overlay */}
                {obj.content && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-white font-black pointer-events-none"
                    style={{ fontSize: Math.max(sz * 0.4, 8), textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {obj.content}
                  </span>
                )}
                {/* Movement indicator */}
                {isMoving && !showEndPositions && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 border border-white" title="Moving object" />
                )}
                {/* Tooltip */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {obj.type}{obj.content ? ` [${obj.content}]` : ''} — {obj.color}
                  {isMoving ? ` → (${obj.endX},${obj.endY})` : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-slate-400">
          {hasMovement && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Moving object</span>}
          {hasContent && <span className="flex items-center gap-1"><span className="font-bold text-slate-600">A</span> Has content</span>}
          <span>{objects.length} objects total</span>
        </div>
      </div>

      {/* Objects table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Objects ({objects.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-1.5 pr-3 text-slate-500">#</th>
                <th className="text-left py-1.5 pr-3 text-slate-500">Type</th>
                <th className="text-left py-1.5 pr-3 text-slate-500">Colour</th>
                <th className="text-left py-1.5 pr-3 text-slate-500">Position</th>
                <th className="text-left py-1.5 pr-3 text-slate-500">Size</th>
                <th className="text-left py-1.5 pr-3 text-slate-500">Content</th>
                <th className="text-left py-1.5 pr-3 text-slate-500">Movement</th>
              </tr>
            </thead>
            <tbody>
              {objects.map((obj, i) => (
                <tr key={obj.id} className="border-b border-gray-50">
                  <td className="py-1.5 pr-3 text-slate-400">{i + 1}</td>
                  <td className="py-1.5 pr-3 font-medium text-slate-700">{obj.type}</td>
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: obj.color }} />
                      <span className="text-slate-500">{obj.color}</span>
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-slate-500">({obj.x}, {obj.y})</td>
                  <td className="py-1.5 pr-3 text-slate-500">{obj.size}</td>
                  <td className="py-1.5 pr-3">{obj.content ? <span className="bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded">{obj.content}</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="py-1.5 pr-3">{obj.endX != null ? <span className="text-purple-600">→ ({obj.endX}, {obj.endY})</span> : <span className="text-slate-300">static</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Questions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Questions ({questions.length})</h2>
          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className={`text-xs px-3 py-1 rounded-lg font-medium ${showAnswers ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-slate-500 hover:bg-gray-200'}`}
          >
            {showAnswers ? 'Hide answers' : 'Show answers'}
          </button>
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-[10px] font-bold text-slate-400 mt-0.5">Q{i + 1}</span>
                <div>
                  <p className="text-xs font-medium text-slate-700">{q.text}</p>
                  <span className="text-[9px] text-slate-400 mt-0.5">{q.category} · {q.timeLimit}s</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 ml-5">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={`text-[11px] px-2 py-1 rounded ${
                      showAnswers && oi === q.correctIndex
                        ? 'bg-green-50 text-green-700 font-semibold border border-green-200'
                        : 'bg-gray-50 text-slate-600 border border-gray-100'
                    }`}
                  >
                    {opt}
                    {showAnswers && oi === q.correctIndex && ' ✓'}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
