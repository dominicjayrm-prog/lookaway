export interface LibraryObject {
  id: string;
  name: string;
  category: Category;
  svgPath: string;
  viewBox: string;
  label?: string;
}

export const CATEGORIES = ['Basic Shapes', 'Numbers', 'Everyday Objects', 'Animals', 'Food'] as const;
export type Category = (typeof CATEGORIES)[number];

export const objectLibrary: LibraryObject[] = [
  // Basic Shapes
  { id: 'circle', name: 'Circle', category: 'Basic Shapes', svgPath: 'CIRCLE', viewBox: '0 0 100 100' },
  { id: 'square', name: 'Square', category: 'Basic Shapes', svgPath: 'RECT', viewBox: '0 0 100 100' },
  { id: 'triangle', name: 'Triangle', category: 'Basic Shapes', svgPath: 'M50 5 L95 95 L5 95 Z', viewBox: '0 0 100 100' },
  { id: 'star', name: 'Star', category: 'Basic Shapes', svgPath: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', viewBox: '0 0 24 24' },
  { id: 'diamond', name: 'Diamond', category: 'Basic Shapes', svgPath: 'M50 5 L95 50 L50 95 L5 50 Z', viewBox: '0 0 100 100' },
  { id: 'hexagon', name: 'Hexagon', category: 'Basic Shapes', svgPath: 'M50 2 L93 25 L93 75 L50 98 L7 75 L7 25 Z', viewBox: '0 0 100 100' },
  { id: 'pentagon', name: 'Pentagon', category: 'Basic Shapes', svgPath: 'M50 2 L97 36 L79 95 L21 95 L3 36 Z', viewBox: '0 0 100 100' },
  { id: 'oval', name: 'Oval', category: 'Basic Shapes', svgPath: 'OVAL', viewBox: '0 0 100 100' },
  { id: 'semicircle', name: 'Semicircle', category: 'Basic Shapes', svgPath: 'M5 50 A45 45 0 0 1 95 50 Z', viewBox: '0 0 100 100' },
  { id: 'ring', name: 'Ring', category: 'Basic Shapes', svgPath: 'RING', viewBox: '0 0 100 100' },
  { id: 'cross', name: 'Cross', category: 'Basic Shapes', svgPath: 'M35 5 L65 5 L65 35 L95 35 L95 65 L65 65 L65 95 L35 95 L35 65 L5 65 L5 35 L35 35 Z', viewBox: '0 0 100 100' },
  { id: 'arrow_right', name: 'Arrow Right', category: 'Basic Shapes', svgPath: 'M5 35 L60 35 L60 15 L95 50 L60 85 L60 65 L5 65 Z', viewBox: '0 0 100 100' },
  { id: 'arrow_up', name: 'Arrow Up', category: 'Basic Shapes', svgPath: 'M35 95 L35 40 L15 40 L50 5 L85 40 L65 40 L65 95 Z', viewBox: '0 0 100 100' },
  { id: 'heart', name: 'Heart', category: 'Basic Shapes', svgPath: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', viewBox: '0 0 24 24' },
  { id: 'crescent', name: 'Crescent', category: 'Basic Shapes', svgPath: 'M50 5 A45 45 0 1 1 50 95 A30 30 0 1 0 50 5 Z', viewBox: '0 0 100 100' },
  // Numbers
  { id: 'number_1', name: 'Number 1', category: 'Numbers', svgPath: 'NUMBER', viewBox: '0 0 100 100', label: '1' },
  { id: 'number_2', name: 'Number 2', category: 'Numbers', svgPath: 'NUMBER', viewBox: '0 0 100 100', label: '2' },
  { id: 'number_3', name: 'Number 3', category: 'Numbers', svgPath: 'NUMBER', viewBox: '0 0 100 100', label: '3' },
  { id: 'number_4', name: 'Number 4', category: 'Numbers', svgPath: 'NUMBER', viewBox: '0 0 100 100', label: '4' },
  { id: 'number_5', name: 'Number 5', category: 'Numbers', svgPath: 'NUMBER', viewBox: '0 0 100 100', label: '5' },
  { id: 'number_6', name: 'Number 6', category: 'Numbers', svgPath: 'NUMBER', viewBox: '0 0 100 100', label: '6' },
  { id: 'number_7', name: 'Number 7', category: 'Numbers', svgPath: 'NUMBER', viewBox: '0 0 100 100', label: '7' },
  { id: 'number_8', name: 'Number 8', category: 'Numbers', svgPath: 'NUMBER', viewBox: '0 0 100 100', label: '8' },
  { id: 'number_9', name: 'Number 9', category: 'Numbers', svgPath: 'NUMBER', viewBox: '0 0 100 100', label: '9' },
  // Everyday Objects
  { id: 'apple', name: 'Apple', category: 'Everyday Objects', svgPath: 'M50 20 Q55 5 60 15 M30 30 Q10 50 25 80 Q40 100 50 95 Q60 100 75 80 Q90 50 70 30 Q60 20 50 25 Q40 20 30 30 Z', viewBox: '0 0 100 100' },
  { id: 'tree', name: 'Tree', category: 'Everyday Objects', svgPath: 'M50 10 L80 50 L65 50 L85 80 L15 80 L35 50 L20 50 Z M42 80 L42 95 L58 95 L58 80 Z', viewBox: '0 0 100 100' },
  { id: 'house', name: 'House', category: 'Everyday Objects', svgPath: 'M50 10 L90 45 L90 90 L10 90 L10 45 Z M35 90 L35 65 L50 65 L50 90 Z M60 55 L75 55 L75 70 L60 70 Z', viewBox: '0 0 100 100' },
  { id: 'cup', name: 'Cup', category: 'Everyday Objects', svgPath: 'M20 25 L20 75 Q20 90 35 90 L65 90 Q80 90 80 75 L80 25 Z M80 35 L90 35 Q95 35 95 45 L95 55 Q95 65 85 65 L80 65 Z', viewBox: '0 0 100 100' },
  { id: 'book', name: 'Book', category: 'Everyday Objects', svgPath: 'M15 15 L50 10 L85 15 L85 85 L50 90 L15 85 Z M50 10 L50 90', viewBox: '0 0 100 100' },
  { id: 'key', name: 'Key', category: 'Everyday Objects', svgPath: 'M30 50 A15 15 0 1 1 30 50.01 M45 50 L85 50 L85 65 L75 65 L75 55 L65 55 L65 65 L60 65 L60 50', viewBox: '0 0 100 100' },
  { id: 'umbrella', name: 'Umbrella', category: 'Everyday Objects', svgPath: 'M10 50 Q10 15 50 15 Q90 15 90 50 L52 50 L52 85 Q52 92 45 92 Q38 92 38 85', viewBox: '0 0 100 100' },
  { id: 'phone', name: 'Phone', category: 'Everyday Objects', svgPath: 'M30 10 Q30 5 35 5 L65 5 Q70 5 70 10 L70 90 Q70 95 65 95 L35 95 Q30 95 30 90 Z M40 88 L60 88 L60 92 L40 92 Z', viewBox: '0 0 100 100' },
  { id: 'clock', name: 'Clock', category: 'Everyday Objects', svgPath: 'CIRCLE', viewBox: '0 0 100 100' },
  { id: 'sun', name: 'Sun', category: 'Everyday Objects', svgPath: 'M50 30 A20 20 0 1 1 50 30.01 M50 5 L50 15 M50 85 L50 95 M5 50 L15 50 M85 50 L95 50 M20 20 L27 27 M73 73 L80 80 M80 20 L73 27 M27 73 L20 80', viewBox: '0 0 100 100' },
  // Animals
  { id: 'cat', name: 'Cat', category: 'Animals', svgPath: 'M50 85 A30 30 0 1 1 50 85.01 M25 35 L15 10 L40 30 M75 35 L85 10 L60 30 M38 55 A3 3 0 1 1 38 55.01 M62 55 A3 3 0 1 1 62 55.01 M47 65 L50 68 L53 65', viewBox: '0 0 100 100' },
  { id: 'dog', name: 'Dog', category: 'Animals', svgPath: 'M50 80 A25 25 0 1 1 50 80.01 M20 45 L10 25 L25 40 M80 45 L90 25 L75 40 M40 60 A3 3 0 1 1 40 60.01 M60 60 A3 3 0 1 1 60 60.01 M45 70 Q50 78 55 70', viewBox: '0 0 100 100' },
  { id: 'fish', name: 'Fish', category: 'Animals', svgPath: 'M20 50 Q40 20 70 50 Q40 80 20 50 Z M70 50 L90 35 L90 65 Z M35 45 A2 2 0 1 1 35 45.01', viewBox: '0 0 100 100' },
  { id: 'bird', name: 'Bird', category: 'Animals', svgPath: 'M50 60 A20 15 0 1 1 50 60.01 M70 55 L85 50 M30 45 Q15 25 5 30 Q20 35 30 45 M35 50 A2 2 0 1 1 35 50.01', viewBox: '0 0 100 100' },
  { id: 'butterfly', name: 'Butterfly', category: 'Animals', svgPath: 'M50 30 L50 80 M50 50 Q25 20 15 40 Q10 55 30 55 Q45 55 50 50 M50 50 Q75 20 85 40 Q90 55 70 55 Q55 55 50 50', viewBox: '0 0 100 100' },
  // Food
  { id: 'pizza', name: 'Pizza', category: 'Food', svgPath: 'M50 15 L85 85 L15 85 Z M40 55 A3 3 0 1 1 40 55.01 M60 50 A3 3 0 1 1 60 50.01 M50 70 A3 3 0 1 1 50 70.01', viewBox: '0 0 100 100' },
  { id: 'cake', name: 'Cake', category: 'Food', svgPath: 'M15 45 L85 45 L85 85 L15 85 Z M15 45 Q15 30 50 30 Q85 30 85 45 M45 30 L45 20 M55 30 L55 20 M50 30 L50 15', viewBox: '0 0 100 100' },
  { id: 'cookie', name: 'Cookie', category: 'Food', svgPath: 'CIRCLE', viewBox: '0 0 100 100' },
  { id: 'ice_cream', name: 'Ice Cream', category: 'Food', svgPath: 'M50 15 A25 25 0 1 1 50 15.01 M30 45 L50 95 L70 45 Z', viewBox: '0 0 100 100' },
  { id: 'donut', name: 'Donut', category: 'Food', svgPath: 'RING', viewBox: '0 0 100 100' },
];

export function getObjectById(id: string): LibraryObject | undefined { return objectLibrary.find(o => o.id === id); }
export function getObjectsByCategory(cat: Category): LibraryObject[] { return objectLibrary.filter(o => o.category === cat); }
