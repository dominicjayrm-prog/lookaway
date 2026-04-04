import type { DailyMode } from '../types/daily';

interface ShareData { correctAnswers: boolean[]; sceneResults?: boolean[][]; totalCorrect: number; totalQuestions: number; percentage: number; timeSeconds?: number; avgTimeSeconds?: number; }

const GREEN = String.fromCodePoint(0x1F7E2);
const RED = String.fromCodePoint(0x1F534);
const BRAIN = String.fromCodePoint(0x1F9E0);
const LIGHTNING = String.fromCodePoint(0x26A1);
const MAG = String.fromCodePoint(0x1F50D);
const EYE = String.fromCodePoint(0x1F441);

function fmtDate(d: string): string { const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; const [,mo,dy] = d.split('-'); return `${m[parseInt(mo,10)-1]} ${parseInt(dy,10)}`; }
function row(a: boolean[]): string { return a.map(c => c ? GREEN : RED).join(''); }
export function formatTime(s: number): string { return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`; }

export function generateShareText(mode: DailyMode, dateStr: string, result: ShareData): string {
  const d = fmtDate(dateStr);
  if (mode === 'classic') {
    const grid = result.sceneResults ? result.sceneResults.map(s => row(s)).join('\n') : (() => { const lines = []; for (let i = 0; i < result.correctAnswers.length; i += 5) lines.push(row(result.correctAnswers.slice(i, i+5))); return lines.join('\n'); })();
    return `BLANKED ${d}\n${grid}\n${BRAIN} ${result.percentage}% (${result.totalCorrect}/${result.totalQuestions})\nplayblanked.app`;
  }
  if (mode === 'speed') {
    const t = result.timeSeconds != null ? formatTime(result.timeSeconds) : '0:00';
    return `BLANKED ${LIGHTNING} ${d}\n${result.totalCorrect}/${result.totalQuestions} in ${t}\n${row(result.correctAnswers)}\nplayblanked.app`;
  }
  const avg = result.avgTimeSeconds != null ? result.avgTimeSeconds.toFixed(1) : '0.0';
  return `BLANKED ${MAG} ${d}\nFound ${result.totalCorrect}/${result.totalQuestions} changes\n${EYE} Avg time: ${avg}s\n${row(result.correctAnswers)}\nplayblanked.app`;
}
