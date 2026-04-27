/**
 * Bilingual variable banks for The Witness scene templates.
 *
 * Each entry is `{ en, es }`. Values are interpolated into the
 * template prose verbatim so they must be lower-case nouns/phrases
 * that read naturally inside a sentence ("a navy apron", "the corner
 * table"). Capitalisation is the template's job, not the bank's.
 *
 * Categories are referenced by ID from `templates.ts` and again by
 * the question generator to build distractors. Two rules govern the
 * banks:
 *   1. Every value within a category must be a valid drop-in for
 *      every slot that uses that category. So COLOURS_PRIMARY only
 *      includes colours that work for apron / coat / book / wall.
 *   2. Distractors come from the slot's own category, minus every
 *      value used anywhere else in the scene. So if "navy" is the
 *      apron AND "olive" is the wall, neither can be a wrong-answer
 *      option for the plate-colour question. This kills the
 *      "is this the apron or the wall" trick-question class.
 *
 * No em-dashes anywhere in this file (per global Blanked voice
 * rule). Commas, semicolons, parentheticals only.
 */

export interface BilingualEntry {
  en: string;
  es: string;
}

// ─── Shared banks (used across all templates) ──────────────────

export const TIMES_OF_DAY: readonly BilingualEntry[] = [
  { en: 'early morning', es: 'temprano por la mañana' },
  { en: 'mid-morning', es: 'a media mañana' },
  { en: 'late morning', es: 'a última hora de la mañana' },
  { en: 'lunchtime', es: 'a la hora del almuerzo' },
  { en: 'early afternoon', es: 'a primera hora de la tarde' },
  { en: 'mid-afternoon', es: 'a media tarde' },
  { en: 'late afternoon', es: 'a última hora de la tarde' },
  { en: 'early evening', es: 'al atardecer' },
  { en: 'evening', es: 'por la noche' },
];

export const WEATHER_AMBIENCE: readonly BilingualEntry[] = [
  { en: 'bright', es: 'luminosa' },
  { en: 'overcast', es: 'nublada' },
  { en: 'rainy', es: 'lluviosa' },
  { en: 'misty', es: 'brumosa' },
  { en: 'breezy', es: 'ventosa' },
  { en: 'sunlit', es: 'soleada' },
  { en: 'still', es: 'tranquila' },
  { en: 'crisp', es: 'fresca' },
  { en: 'humid', es: 'húmeda' },
  { en: 'golden', es: 'dorada' },
  { en: 'grey', es: 'gris' },
  { en: 'warm', es: 'cálida' },
];

export const COLOURS_PRIMARY: readonly BilingualEntry[] = [
  { en: 'navy', es: 'azul marino' },
  { en: 'olive', es: 'verde oliva' },
  { en: 'burgundy', es: 'burdeos' },
  { en: 'cream', es: 'crema' },
  { en: 'charcoal', es: 'gris carbón' },
  { en: 'mustard', es: 'mostaza' },
  { en: 'forest green', es: 'verde bosque' },
  { en: 'pale blue', es: 'azul claro' },
  { en: 'rust', es: 'óxido' },
  { en: 'plum', es: 'ciruela' },
  { en: 'sand', es: 'arena' },
  { en: 'slate', es: 'pizarra' },
];

// Quarter-hour times. Picked over per-minute granularity because
// "the clock reads 7:13" is harder to encode in a question pool
// than "7:15", and round times read more natural in prose.
export const TIMES_ON_CLOCK: readonly BilingualEntry[] = (() => {
  const out: BilingualEntry[] = [];
  for (let hour = 7; hour <= 19; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      const m = String(minute).padStart(2, '0');
      const display = `${hour}:${m}`;
      out.push({ en: display, es: display });
    }
  }
  return out;
})();

export const NUMBERS_TABLE: readonly BilingualEntry[] = [
  { en: 'one', es: 'una' },
  { en: 'two', es: 'dos' },
  { en: 'three', es: 'tres' },
  { en: 'four', es: 'cuatro' },
  { en: 'five', es: 'cinco' },
  { en: 'six', es: 'seis' },
  { en: 'seven', es: 'siete' },
  { en: 'eight', es: 'ocho' },
];

// Descriptors for the secondary character (the bystander / passing
// stranger). The indefinite article is baked into each entry so the
// gender of the article matches the noun in Spanish ("un hombre" /
// "una mujer"). Avoids the "Un mujer" agreement bug that bites if
// the article sits in the prose template instead.
export const CHARACTER_B_DESCRIPTORS: readonly BilingualEntry[] = [
  { en: 'a man in a green raincoat', es: 'un hombre con un impermeable verde' },
  { en: 'a woman in a yellow scarf', es: 'una mujer con una bufanda amarilla' },
  { en: 'a man in a tweed jacket', es: 'un hombre con una chaqueta de tweed' },
  { en: 'a woman in a denim jacket', es: 'una mujer con una chaqueta vaquera' },
  { en: 'a man in a flat cap', es: 'un hombre con una gorra plana' },
  { en: 'a woman in a wool cardigan', es: 'una mujer con un cárdigan de lana' },
  { en: 'a teenager in a hooded jumper', es: 'una persona joven con una sudadera con capucha' },
  { en: 'a man with round glasses', es: 'un hombre con gafas redondas' },
  { en: 'a woman in a striped jumper', es: 'una mujer con un jersey de rayas' },
  { en: 'a man with a leather satchel', es: 'un hombre con un bolso de cuero' },
  { en: 'a woman with silver earrings', es: 'una mujer con pendientes plateados' },
  { en: 'a man in a navy peacoat', es: 'un hombre con un abrigo azul marino' },
];

export const CHARACTER_B_ACTIONS: readonly BilingualEntry[] = [
  { en: 'reading a folded newspaper', es: 'leyendo un periódico doblado' },
  { en: 'writing in a small notebook', es: 'escribiendo en un cuaderno pequeño' },
  { en: 'sketching on a napkin', es: 'haciendo bocetos en una servilleta' },
  { en: 'flipping through a magazine', es: 'hojeando una revista' },
  { en: 'tapping at a phone', es: 'tecleando en el teléfono' },
  { en: 'staring at the door', es: 'mirando hacia la puerta' },
  { en: 'unfolding a city map', es: 'desplegando un mapa de la ciudad' },
  { en: 'sipping slowly from a cup', es: 'bebiendo despacio de una taza' },
  { en: 'whispering into a phone', es: 'susurrando al teléfono' },
  { en: 'thumbing through a paperback', es: 'pasando las páginas de un libro' },
];

export const CLOSING_BEATS: readonly BilingualEntry[] = [
  { en: 'A radio plays softly somewhere out of sight', es: 'Una radio suena suavemente fuera de la vista' },
  { en: 'Outside, a tram rolls past with a faint chime', es: 'Fuera, un tranvía pasa con un tintineo lejano' },
  { en: 'A small dog yawns in the corner', es: 'Un perro pequeño bosteza en el rincón' },
  { en: 'Steam curls slowly toward the ceiling', es: 'El vapor sube despacio hacia el techo' },
  { en: 'A bell over the door rings as someone leaves', es: 'Una campanilla sobre la puerta suena cuando alguien sale' },
  { en: 'Pages turn somewhere behind a shelf', es: 'Se pasan páginas detrás de una estantería' },
  { en: 'A clock ticks louder than it has any right to', es: 'Un reloj hace tictac más fuerte de lo que debería' },
];

// ─── Coffee Shop bank ──────────────────────────────────────────

export const COFFEE_SHOP_BARISTA_ACTIONS: readonly BilingualEntry[] = [
  { en: 'wiping down the espresso machine', es: 'limpiando la máquina de espresso' },
  { en: 'frothing milk for a cappuccino', es: 'espumando leche para un capuchino' },
  { en: 'arranging pastries under the dome', es: 'colocando los pasteles bajo la cúpula' },
  { en: 'tamping coffee into a portafilter', es: 'prensando café en el portafiltro' },
  { en: 'rinsing a row of cups in the sink', es: 'enjuagando una hilera de tazas en el fregadero' },
  { en: 'writing the day’s specials on a chalkboard', es: 'escribiendo las especialidades del día en una pizarra' },
];

export const COFFEE_SHOP_OBJECTS: readonly BilingualEntry[] = [
  { en: 'a glass jar of biscotti', es: 'un tarro de cristal con biscotti' },
  { en: 'a bowl of brown sugar cubes', es: 'un cuenco de azúcar moreno en cubos' },
  { en: 'a small vase of daisies', es: 'un jarrón pequeño con margaritas' },
  { en: 'a wooden tip jar', es: 'un tarro de propinas de madera' },
  { en: 'a stack of takeaway cups', es: 'una pila de vasos para llevar' },
  { en: 'a chrome bell with a handwritten sign', es: 'una campana cromada con un cartel escrito a mano' },
  { en: 'a plate of lemon shortbread', es: 'un plato de galletas de limón' },
  { en: 'a hand-drawn menu on cardboard', es: 'un menú dibujado a mano sobre cartón' },
];

export const COFFEE_SHOP_CUSTOMER_LOCATIONS: readonly BilingualEntry[] = [
  { en: 'at the corner table', es: 'en la mesa del rincón' },
  { en: 'by the front window', es: 'junto a la ventana delantera' },
  { en: 'at the bar facing the street', es: 'en la barra frente a la calle' },
  { en: 'at the table nearest the door', es: 'en la mesa más cercana a la puerta' },
  { en: 'at the small round table in back', es: 'en la mesita redonda del fondo' },
];

// ─── Bakery bank ───────────────────────────────────────────────

export const BAKERY_BAKER_ACTIONS: readonly BilingualEntry[] = [
  { en: 'arranging fresh croissants on a wooden tray', es: 'colocando cruasanes frescos en una bandeja de madera' },
  { en: 'tying twine around a bakery box', es: 'atando un cordel alrededor de una caja de panadería' },
  { en: 'dusting flour off a marble counter', es: 'sacudiendo harina de un mostrador de mármol' },
  { en: 'sliding a baguette into a paper sleeve', es: 'metiendo una baguette en una funda de papel' },
  { en: 'piping cream into the centre of an éclair', es: 'rellenando un éclair con crema' },
  { en: 'pulling a sourdough loaf from the oven', es: 'sacando un pan de masa madre del horno' },
];

export const BAKERY_OBJECTS: readonly BilingualEntry[] = [
  { en: 'a tray of cinnamon buns', es: 'una bandeja de bollos de canela' },
  { en: 'a basket of crusty rolls', es: 'una cesta de panecillos crujientes' },
  { en: 'a row of glass cake stands', es: 'una hilera de soportes de cristal para tartas' },
  { en: 'a chalkboard listing today’s loaves', es: 'una pizarra con los panes del día' },
  { en: 'a wicker basket of macarons', es: 'una cesta de mimbre con macarons' },
  { en: 'a paper bag of madeleines', es: 'una bolsa de papel con magdalenas' },
  { en: 'a pyramid of jam jars', es: 'una pirámide de tarros de mermelada' },
  { en: 'a wooden bowl of croissant ends', es: 'un cuenco de madera con trozos de cruasán' },
];

export const BAKERY_CUSTOMER_LOCATIONS: readonly BilingualEntry[] = [
  { en: 'at the small bistro table by the door', es: 'en la mesita de bistró junto a la puerta' },
  { en: 'on the bench beside the window', es: 'en el banco al lado de la ventana' },
  { en: 'at the counter waiting to order', es: 'en el mostrador esperando para pedir' },
  { en: 'just inside the entrance', es: 'justo dentro de la entrada' },
  { en: 'at the long shared table down the side', es: 'en la mesa larga compartida del lateral' },
];

// ─── Bookshop bank ─────────────────────────────────────────────

export const BOOKSHOP_OWNER_ACTIONS: readonly BilingualEntry[] = [
  { en: 'reshelving a stack of paperbacks', es: 'colocando una pila de libros de bolsillo' },
  { en: 'pricing a hardback with a small pencil', es: 'poniendo el precio a un libro de tapa dura con un lápiz' },
  { en: 'arranging a window display of poetry', es: 'montando un escaparate de poesía' },
  { en: 'unboxing a delivery on the floor', es: 'desembalando un pedido en el suelo' },
  { en: 'flipping through an old atlas', es: 'hojeando un atlas antiguo' },
  { en: 'wiping dust off the top of a shelf', es: 'limpiando el polvo de lo alto de una estantería' },
];

export const BOOKSHOP_OBJECTS: readonly BilingualEntry[] = [
  { en: 'a leather chesterfield armchair', es: 'una butaca chesterfield de cuero' },
  { en: 'a brass desk lamp with a green shade', es: 'una lámpara de escritorio de latón con pantalla verde' },
  { en: 'a wooden ladder against the far shelf', es: 'una escalera de madera contra la estantería del fondo' },
  { en: 'a glass cabinet of first editions', es: 'una vitrina de primeras ediciones' },
  { en: 'a hand-painted "open" sign', es: 'un cartel pintado a mano que dice "abierto"' },
  { en: 'a bowl of mint sweets on the counter', es: 'un cuenco de caramelos de menta sobre el mostrador' },
  { en: 'a tabby cat curled on a stack of books', es: 'un gato atigrado acurrucado sobre una pila de libros' },
  { en: 'a typewriter on a small side table', es: 'una máquina de escribir en una mesita auxiliar' },
];

export const BOOKSHOP_CUSTOMER_LOCATIONS: readonly BilingualEntry[] = [
  { en: 'in the poetry aisle', es: 'en el pasillo de poesía' },
  { en: 'by the window seat', es: 'junto al asiento de la ventana' },
  { en: 'beside the bargain table', es: 'al lado de la mesa de ofertas' },
  { en: 'near the children’s corner', es: 'cerca del rincón infantil' },
  { en: 'at the second-hand shelf in back', es: 'en la estantería de segunda mano del fondo' },
];

// ─── Park Bench bank ───────────────────────────────────────────

// Park-bench actions are framed in second person ("You sit...,
// {action}") so every entry must read naturally as a continuation
// of a "you" subject. Avoid pronouns that imply a third-person
// referent.
export const PARK_PROTAGONIST_ACTIONS: readonly BilingualEntry[] = [
  { en: 'scattering breadcrumbs for the pigeons', es: 'esparciendo migas de pan para las palomas' },
  { en: 'unwrapping a sandwich from wax paper', es: 'desenvolviendo un sándwich de papel encerado' },
  { en: 'sipping coffee from a thermos lid', es: 'bebiendo café de la tapa de un termo' },
  { en: 'reading a paperback open on your lap', es: 'leyendo un libro abierto sobre tu regazo' },
  { en: 'writing a postcard with a chewed pen', es: 'escribiendo una postal con un bolígrafo mordido' },
  { en: 'tossing crumbs to a single sparrow', es: 'lanzando migas a un solo gorrión' },
];

export const PARK_OBJECTS: readonly BilingualEntry[] = [
  { en: 'a wrought-iron lamp post', es: 'una farola de hierro forjado' },
  { en: 'a bronze statue of a poet', es: 'una estatua de bronce de un poeta' },
  { en: 'a painted bandstand in the distance', es: 'un quiosco de música pintado a lo lejos' },
  { en: 'a green metal litter bin', es: 'una papelera verde de metal' },
  { en: 'a wooden noticeboard tacked with flyers', es: 'un tablón de madera con folletos clavados' },
  { en: 'a circle of fallen chestnuts', es: 'un círculo de castañas caídas' },
  { en: 'a child’s red bicycle on its side', es: 'una bicicleta roja de niño tumbada en el suelo' },
  { en: 'a stone fountain barely trickling', es: 'una fuente de piedra que apenas gotea' },
];

export const PARK_STRANGER_LOCATIONS: readonly BilingualEntry[] = [
  { en: 'on the bench across the path', es: 'en el banco al otro lado del camino' },
  { en: 'feeding the ducks at the pond edge', es: 'dando de comer a los patos al borde del estanque' },
  { en: 'leaning against the lamp post', es: 'apoyado en la farola' },
  { en: 'walking a small dog along the path', es: 'paseando a un perro pequeño por el camino' },
  { en: 'sitting cross-legged on the grass', es: 'sentado con las piernas cruzadas sobre la hierba' },
];
