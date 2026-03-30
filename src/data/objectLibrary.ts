/**
 * Object Library for the LOOKAWAY game app.
 * Maps object IDs to their metadata so the SceneRenderer can look up types.
 * The actual rendering is handled by SceneRenderer using react-native-svg.
 * This file mirrors the admin objectLibrary — keep them in sync.
 */

export interface GameLibraryItem {
  id: string;
  name: string;
  category: string;
  /** The shape type used by SceneRenderer */
  shapeType: string;
  /** Label for number/letter types */
  label?: string;
}

export const objectCategories = [
  { id: 'basic', name: 'Basic Shapes', count: 15 },
  { id: 'numbers', name: 'Numbers', count: 9 },
  { id: 'letters', name: 'Letters', count: 26 },
  { id: 'everyday', name: 'Everyday Objects', count: 15 },
  { id: 'animals', name: 'Animals', count: 10 },
  { id: 'food', name: 'Food & Drink', count: 10 },
  { id: 'patterns', name: 'Patterns & Special', count: 6 },
];

// Basic shapes map directly to SceneRenderer shape types
const basicShapes: GameLibraryItem[] = [
  { id: 'circle', name: 'Circle', category: 'Basic Shapes', shapeType: 'circle' },
  { id: 'square', name: 'Square', category: 'Basic Shapes', shapeType: 'square' },
  { id: 'triangle', name: 'Triangle', category: 'Basic Shapes', shapeType: 'triangle' },
  { id: 'star', name: 'Star', category: 'Basic Shapes', shapeType: 'star' },
  { id: 'diamond', name: 'Diamond', category: 'Basic Shapes', shapeType: 'diamond' },
  { id: 'hexagon', name: 'Hexagon', category: 'Basic Shapes', shapeType: 'hexagon' },
  { id: 'pentagon', name: 'Pentagon', category: 'Basic Shapes', shapeType: 'circle' },
  { id: 'oval', name: 'Oval', category: 'Basic Shapes', shapeType: 'circle' },
  { id: 'semicircle', name: 'Semicircle', category: 'Basic Shapes', shapeType: 'circle' },
  { id: 'ring', name: 'Ring', category: 'Basic Shapes', shapeType: 'circle' },
  { id: 'cross', name: 'Cross', category: 'Basic Shapes', shapeType: 'square' },
  { id: 'heart', name: 'Heart', category: 'Basic Shapes', shapeType: 'heart' },
  { id: 'crescent', name: 'Crescent', category: 'Basic Shapes', shapeType: 'circle' },
  { id: 'arrow_right', name: 'Arrow Right', category: 'Basic Shapes', shapeType: 'diamond' },
  { id: 'arrow_up', name: 'Arrow Up', category: 'Basic Shapes', shapeType: 'triangle' },
];

const numbers: GameLibraryItem[] = [1,2,3,4,5,6,7,8,9].map(n => ({
  id: `number_${n}`, name: `${n}`, category: 'Numbers', shapeType: 'number', label: `${n}`,
}));

const letters: GameLibraryItem[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => ({
  id: `letter_${l}`, name: l, category: 'Letters', shapeType: 'letter', label: l,
}));

const everyday: GameLibraryItem[] = [
  { id: 'apple', name: 'Apple', category: 'Everyday Objects', shapeType: 'circle' },
  { id: 'tree', name: 'Tree', category: 'Everyday Objects', shapeType: 'triangle' },
  { id: 'house', name: 'House', category: 'Everyday Objects', shapeType: 'square' },
  { id: 'car', name: 'Car', category: 'Everyday Objects', shapeType: 'square' },
  { id: 'key', name: 'Key', category: 'Everyday Objects', shapeType: 'diamond' },
  { id: 'book', name: 'Book', category: 'Everyday Objects', shapeType: 'square' },
  { id: 'cup', name: 'Cup', category: 'Everyday Objects', shapeType: 'square' },
  { id: 'clock', name: 'Clock', category: 'Everyday Objects', shapeType: 'circle' },
  { id: 'umbrella', name: 'Umbrella', category: 'Everyday Objects', shapeType: 'triangle' },
  { id: 'phone', name: 'Phone', category: 'Everyday Objects', shapeType: 'square' },
  { id: 'lightbulb', name: 'Light Bulb', category: 'Everyday Objects', shapeType: 'circle' },
  { id: 'flower', name: 'Flower', category: 'Everyday Objects', shapeType: 'circle' },
  { id: 'sun', name: 'Sun', category: 'Everyday Objects', shapeType: 'circle' },
  { id: 'cloud', name: 'Cloud', category: 'Everyday Objects', shapeType: 'circle' },
  { id: 'moon_obj', name: 'Moon', category: 'Everyday Objects', shapeType: 'circle' },
];

const animals: GameLibraryItem[] = [
  { id: 'cat', name: 'Cat', category: 'Animals', shapeType: 'circle' },
  { id: 'dog', name: 'Dog', category: 'Animals', shapeType: 'circle' },
  { id: 'fish', name: 'Fish', category: 'Animals', shapeType: 'diamond' },
  { id: 'bird', name: 'Bird', category: 'Animals', shapeType: 'circle' },
  { id: 'butterfly', name: 'Butterfly', category: 'Animals', shapeType: 'diamond' },
  { id: 'rabbit', name: 'Rabbit', category: 'Animals', shapeType: 'circle' },
  { id: 'frog', name: 'Frog', category: 'Animals', shapeType: 'circle' },
  { id: 'ladybug', name: 'Ladybug', category: 'Animals', shapeType: 'circle' },
  { id: 'turtle', name: 'Turtle', category: 'Animals', shapeType: 'circle' },
  { id: 'bee', name: 'Bee', category: 'Animals', shapeType: 'circle' },
];

const food: GameLibraryItem[] = [
  { id: 'pizza', name: 'Pizza', category: 'Food & Drink', shapeType: 'triangle' },
  { id: 'cake', name: 'Cake', category: 'Food & Drink', shapeType: 'square' },
  { id: 'cookie', name: 'Cookie', category: 'Food & Drink', shapeType: 'circle' },
  { id: 'icecream', name: 'Ice Cream', category: 'Food & Drink', shapeType: 'triangle' },
  { id: 'donut', name: 'Donut', category: 'Food & Drink', shapeType: 'circle' },
  { id: 'watermelon', name: 'Watermelon', category: 'Food & Drink', shapeType: 'triangle' },
  { id: 'cherry', name: 'Cherry', category: 'Food & Drink', shapeType: 'circle' },
  { id: 'coffee', name: 'Coffee', category: 'Food & Drink', shapeType: 'square' },
  { id: 'banana', name: 'Banana', category: 'Food & Drink', shapeType: 'circle' },
  { id: 'lemon', name: 'Lemon', category: 'Food & Drink', shapeType: 'circle' },
];

const patterns: GameLibraryItem[] = [
  { id: 'bullseye', name: 'Bullseye', category: 'Patterns & Special', shapeType: 'circle' },
  { id: 'half_half', name: 'Half and Half', category: 'Patterns & Special', shapeType: 'circle' },
  { id: 'striped_circle', name: 'Striped', category: 'Patterns & Special', shapeType: 'circle' },
  { id: 'checkerboard', name: 'Checker', category: 'Patterns & Special', shapeType: 'square' },
  { id: 'spiral', name: 'Spiral', category: 'Patterns & Special', shapeType: 'circle' },
  { id: 'wave', name: 'Wave', category: 'Patterns & Special', shapeType: 'circle' },
];

export const gameObjectLibrary: GameLibraryItem[] = [
  ...basicShapes, ...numbers, ...letters, ...everyday, ...animals, ...food, ...patterns,
];

export function getGameObjectById(id: string): GameLibraryItem | undefined {
  return gameObjectLibrary.find(o => o.id === id);
}
