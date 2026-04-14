/**
 * Shared type definitions for the Speed Round and Spot The Change
 * game modes. (Previously also hosted Daily Challenge types; that
 * feature has been removed.)
 */
import type { SceneObject, Question } from './game';

export interface SpeedScene { id: string; viewTime: number; objects: SceneObject[]; question: Question; }
export interface SpeedChallenge { mode: 'speed'; scenes: SpeedScene[]; }

export type ChangeType = 'color_change' | 'position_change' | 'removed' | 'added' | 'shape_change' | 'size_change';
export interface SpotChange { type: ChangeType; objectId: string; description: string; targetArea: { x: number; y: number; radius: number }; }
export interface SpotRound { id: string; viewTime: number; originalScene: { objects: SceneObject[] }; modifiedScene: { objects: SceneObject[] }; change: SpotChange; }
export interface SpotTheChangeChallenge { mode: 'spot_the_change'; rounds: SpotRound[]; }
