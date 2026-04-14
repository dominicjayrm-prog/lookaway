export interface SceneObject { id: string; type: string; color: string; x: number; y: number; size: number; rotation?: number; zIndex?: number; label?: string; }
export interface Question { id: string; text: string; options: [string,string,string,string]; correctIndex: 0|1|2|3; category: string; timeLimit: number; }
export interface Scene { id: string; viewTime: number; objects: SceneObject[]; questions: Question[]; }
