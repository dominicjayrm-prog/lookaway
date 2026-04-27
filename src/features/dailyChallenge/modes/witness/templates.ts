/**
 * The four narrative templates for The Witness (v1).
 *
 * Each template defines:
 *   - a stable id (used for analytics + per-template question
 *     phrasing in the question generator)
 *   - the slot list — which variables are picked + their categories
 *     + whether they're questionable (used to build candidate
 *     questions) + the question template per slot per locale
 *   - the prose template per locale, with `{slot_id}` tokens
 *     interpolated at generation time
 *
 * Voice: warm, observational, novel-cover energy. No em-dashes
 * anywhere (per global Blanked rule). Commas, semicolons, and
 * parentheticals only. Sentences are short to medium length so the
 * 35-65 audience can read at pace without losing the thread.
 *
 * Word counts target ~95-110 EN, ~95-110 ES so the read takes
 * roughly 30-40 seconds at a relaxed adult reading speed (~200wpm),
 * matching the 35s soft progress bar.
 */
import type { BilingualEntry } from './variableBanks';
import {
  TIMES_OF_DAY,
  WEATHER_AMBIENCE,
  COLOURS_PRIMARY,
  TIMES_ON_CLOCK,
  NUMBERS_TABLE,
  CHARACTER_B_DESCRIPTORS,
  CHARACTER_B_ACTIONS,
  CLOSING_BEATS,
  COFFEE_SHOP_BARISTA_ACTIONS,
  COFFEE_SHOP_OBJECTS,
  COFFEE_SHOP_CUSTOMER_LOCATIONS,
  BAKERY_BAKER_ACTIONS,
  BAKERY_OBJECTS,
  BAKERY_CUSTOMER_LOCATIONS,
  BOOKSHOP_OWNER_ACTIONS,
  BOOKSHOP_OBJECTS,
  BOOKSHOP_CUSTOMER_LOCATIONS,
  PARK_PROTAGONIST_ACTIONS,
  PARK_OBJECTS,
  PARK_STRANGER_LOCATIONS,
} from './variableBanks';

/** Canonical category labels. The question generator uses these as
 *  buckets for the variety-spread picker, and to look up the bank
 *  to draw distractors from. Two slots that share a category share
 *  a distractor pool (and exclude each other's value at the same
 *  time, per the wrong-answer rule). */
export type SlotCategory =
  | 'TIMES_OF_DAY'
  | 'WEATHER_AMBIENCE'
  | 'COLOURS_PRIMARY'
  | 'TIMES_ON_CLOCK'
  | 'NUMBERS_TABLE'
  | 'CHARACTER_B_DESCRIPTORS'
  | 'CHARACTER_B_ACTIONS'
  | 'CHARACTER_A_ACTIONS'
  | 'OBJECTS_PROMINENT'
  | 'CHARACTER_B_LOCATIONS'
  | 'CLOSING_BEATS';

// Categories whose bank is the same across every template.
const SHARED_BANKS: Partial<Record<SlotCategory, readonly BilingualEntry[]>> = {
  TIMES_OF_DAY,
  WEATHER_AMBIENCE,
  COLOURS_PRIMARY,
  TIMES_ON_CLOCK,
  NUMBERS_TABLE,
  CHARACTER_B_DESCRIPTORS,
  CHARACTER_B_ACTIONS,
  CLOSING_BEATS,
};

// Categories whose bank varies per template (the protagonist's
// actions, the prominent objects, and the secondary character's
// location all read template-flavoured). Adding a template means
// one entry here, not a new branch in getBank.
type PerTemplateCategory = 'CHARACTER_A_ACTIONS' | 'OBJECTS_PROMINENT' | 'CHARACTER_B_LOCATIONS';
const PER_TEMPLATE_BANKS: Record<TemplateId, Record<PerTemplateCategory, readonly BilingualEntry[]>> = {
  coffee_shop: {
    CHARACTER_A_ACTIONS: COFFEE_SHOP_BARISTA_ACTIONS,
    OBJECTS_PROMINENT: COFFEE_SHOP_OBJECTS,
    CHARACTER_B_LOCATIONS: COFFEE_SHOP_CUSTOMER_LOCATIONS,
  },
  bakery: {
    CHARACTER_A_ACTIONS: BAKERY_BAKER_ACTIONS,
    OBJECTS_PROMINENT: BAKERY_OBJECTS,
    CHARACTER_B_LOCATIONS: BAKERY_CUSTOMER_LOCATIONS,
  },
  bookshop: {
    CHARACTER_A_ACTIONS: BOOKSHOP_OWNER_ACTIONS,
    OBJECTS_PROMINENT: BOOKSHOP_OBJECTS,
    CHARACTER_B_LOCATIONS: BOOKSHOP_CUSTOMER_LOCATIONS,
  },
  park_bench: {
    CHARACTER_A_ACTIONS: PARK_PROTAGONIST_ACTIONS,
    OBJECTS_PROMINENT: PARK_OBJECTS,
    CHARACTER_B_LOCATIONS: PARK_STRANGER_LOCATIONS,
  },
};

/** Bank lookup. Returned as `readonly BilingualEntry[]` so callers
 *  treat it as a frozen pool. */
export function getBank(category: SlotCategory, templateId: TemplateId): readonly BilingualEntry[] {
  const shared = SHARED_BANKS[category];
  if (shared) return shared;
  return PER_TEMPLATE_BANKS[templateId][category as PerTemplateCategory];
}

/** Slot definition. `id` is the token interpolated into the prose
 *  (e.g. `{apron_colour}`); `category` picks the bank; `questionable`
 *  marks slots that the question generator may build a question
 *  from (some slots like `weather` add atmosphere but don't make
 *  for fair memory questions, so we mark them false). */
export interface SlotDef {
  id: string;
  category: SlotCategory;
  questionable: boolean;
  /** Localised question phrasing if the player is asked about this
   *  slot. The generator copies this onto the WitnessQuestion at
   *  pick time. May contain `{role}` etc. for further interpolation
   *  but v1 keeps it static. */
  question?: { en: string; es: string };
}

export type TemplateId = 'coffee_shop' | 'bakery' | 'bookshop' | 'park_bench';

export interface SceneTemplate {
  id: TemplateId;
  /** Localised display title; used by the result screen / share
   *  card eyebrow above the snippet. */
  title: { en: string; es: string };
  slots: readonly SlotDef[];
  /** Prose template with `{slot_id}` tokens. The generator
   *  interpolates each slot's picked value (locale-correct). */
  prose: { en: string; es: string };
}

// ─── Templates ──────────────────────────────────────────────────

export const TEMPLATES: readonly SceneTemplate[] = [
  {
    id: 'coffee_shop',
    title: { en: 'The corner café', es: 'El café de la esquina' },
    slots: [
      { id: 'weather', category: 'WEATHER_AMBIENCE', questionable: false },
      { id: 'time_of_day', category: 'TIMES_OF_DAY', questionable: true,
        question: { en: 'What time of day was it?', es: '¿En qué momento del día era?' } },
      { id: 'apron_colour', category: 'COLOURS_PRIMARY', questionable: true,
        question: { en: 'What colour was the barista’s apron?', es: '¿De qué color era el delantal del barista?' } },
      { id: 'barista_action', category: 'CHARACTER_A_ACTIONS', questionable: true,
        question: { en: 'What was the barista doing?', es: '¿Qué estaba haciendo el barista?' } },
      { id: 'clock_time', category: 'TIMES_ON_CLOCK', questionable: true,
        question: { en: 'What time did the wall clock read?', es: '¿Qué hora marcaba el reloj de pared?' } },
      { id: 'table_count', category: 'NUMBERS_TABLE', questionable: true,
        question: { en: 'How many small tables lined the front window?', es: '¿Cuántas mesitas había junto a la ventana delantera?' } },
      { id: 'customer_descriptor', category: 'CHARACTER_B_DESCRIPTORS', questionable: true,
        question: { en: 'Who else was in the café?', es: '¿Quién más estaba en el café?' } },
      { id: 'customer_location', category: 'CHARACTER_B_LOCATIONS', questionable: true,
        question: { en: 'Where was the other customer sitting?', es: '¿Dónde estaba sentado el otro cliente?' } },
      { id: 'customer_action', category: 'CHARACTER_B_ACTIONS', questionable: true,
        question: { en: 'What was the other customer doing?', es: '¿Qué estaba haciendo el otro cliente?' } },
      { id: 'prominent_object', category: 'OBJECTS_PROMINENT', questionable: true,
        question: { en: 'What stood out on the counter?', es: '¿Qué destacaba sobre el mostrador?' } },
      { id: 'closing_beat', category: 'CLOSING_BEATS', questionable: false },
    ],
    prose: {
      en:
        "The corner café, {time_of_day}. " +
        "The light through the front window is {weather}. " +
        "Behind the counter, a barista in a {apron_colour} apron is {barista_action}. " +
        "The wall clock above the espresso machine reads {clock_time}. " +
        "Along the front window are {table_count} small tables, each with a tea light flickering in a glass jar. " +
        "{customer_descriptor}, {customer_location}, {customer_action}. " +
        "On the counter sits {prominent_object}. " +
        "{closing_beat}.",
      es:
        "El café de la esquina, {time_of_day}. " +
        "La luz por la ventana delantera es {weather}. " +
        "Detrás del mostrador, un barista con un delantal {apron_colour} está {barista_action}. " +
        "El reloj de pared encima de la máquina de espresso marca las {clock_time}. " +
        "A lo largo de la ventana delantera hay {table_count} mesitas, cada una con una vela parpadeando en un tarro de cristal. " +
        "{customer_descriptor}, {customer_location}, {customer_action}. " +
        "Sobre el mostrador hay {prominent_object}. " +
        "{closing_beat}.",
    },
  },

  {
    id: 'bakery',
    title: { en: 'The village bakery', es: 'La panadería del pueblo' },
    slots: [
      { id: 'weather', category: 'WEATHER_AMBIENCE', questionable: false },
      { id: 'time_of_day', category: 'TIMES_OF_DAY', questionable: true,
        question: { en: 'What time of day was it?', es: '¿En qué momento del día era?' } },
      { id: 'apron_colour', category: 'COLOURS_PRIMARY', questionable: true,
        question: { en: 'What colour was the baker’s apron?', es: '¿De qué color era el delantal del panadero?' } },
      { id: 'baker_action', category: 'CHARACTER_A_ACTIONS', questionable: true,
        question: { en: 'What was the baker doing?', es: '¿Qué estaba haciendo el panadero?' } },
      { id: 'clock_time', category: 'TIMES_ON_CLOCK', questionable: true,
        question: { en: 'What time did the bakery clock read?', es: '¿Qué hora marcaba el reloj de la panadería?' } },
      { id: 'loaf_count', category: 'NUMBERS_TABLE', questionable: true,
        question: { en: 'How many loaves were stacked on the rack?', es: '¿Cuántos panes había apilados en la rejilla?' } },
      { id: 'customer_descriptor', category: 'CHARACTER_B_DESCRIPTORS', questionable: true,
        question: { en: 'Who else was in the bakery?', es: '¿Quién más estaba en la panadería?' } },
      { id: 'customer_location', category: 'CHARACTER_B_LOCATIONS', questionable: true,
        question: { en: 'Where was the other customer?', es: '¿Dónde estaba el otro cliente?' } },
      { id: 'customer_action', category: 'CHARACTER_B_ACTIONS', questionable: true,
        question: { en: 'What was the other customer doing?', es: '¿Qué estaba haciendo el otro cliente?' } },
      { id: 'prominent_object', category: 'OBJECTS_PROMINENT', questionable: true,
        question: { en: 'What stood out behind the counter?', es: '¿Qué destacaba detrás del mostrador?' } },
      { id: 'closing_beat', category: 'CLOSING_BEATS', questionable: false },
    ],
    prose: {
      en:
        "The village bakery, {time_of_day}. " +
        "The light through the door is {weather}. " +
        "The baker, in a {apron_colour} apron, is {baker_action}. " +
        "Above the till, the small clock reads {clock_time}. " +
        "On the cooling rack, {loaf_count} sourdough loaves rest, each scored with a single curved line. " +
        "{customer_descriptor}, {customer_location}, {customer_action}. " +
        "Behind the counter sits {prominent_object}, half-priced after the morning. " +
        "{closing_beat}.",
      es:
        "La panadería del pueblo, {time_of_day}. " +
        "La luz por la puerta es {weather}. " +
        "El panadero, con un delantal {apron_colour}, está {baker_action}. " +
        "Sobre la caja, el pequeño reloj marca las {clock_time}. " +
        "En la rejilla de enfriamiento descansan {loaf_count} panes de masa madre, cada uno marcado con una sola línea curva. " +
        "{customer_descriptor}, {customer_location}, {customer_action}. " +
        "Detrás del mostrador hay {prominent_object}, a mitad de precio tras la mañana. " +
        "{closing_beat}.",
    },
  },

  {
    id: 'bookshop',
    title: { en: 'The second-hand bookshop', es: 'La librería de segunda mano' },
    slots: [
      { id: 'weather', category: 'WEATHER_AMBIENCE', questionable: false },
      { id: 'time_of_day', category: 'TIMES_OF_DAY', questionable: true,
        question: { en: 'What time of day was it?', es: '¿En qué momento del día era?' } },
      { id: 'cardigan_colour', category: 'COLOURS_PRIMARY', questionable: true,
        question: { en: 'What colour was the shopkeeper’s cardigan?', es: '¿De qué color era el cárdigan del librero?' } },
      { id: 'owner_action', category: 'CHARACTER_A_ACTIONS', questionable: true,
        question: { en: 'What was the shopkeeper doing?', es: '¿Qué estaba haciendo el librero?' } },
      { id: 'clock_time', category: 'TIMES_ON_CLOCK', questionable: true,
        question: { en: 'What time did the carriage clock read?', es: '¿Qué hora marcaba el reloj de carruaje?' } },
      { id: 'shelf_count', category: 'NUMBERS_TABLE', questionable: true,
        question: { en: 'How many tall shelves stood along the back wall?', es: '¿Cuántas estanterías altas había a lo largo de la pared del fondo?' } },
      { id: 'customer_descriptor', category: 'CHARACTER_B_DESCRIPTORS', questionable: true,
        question: { en: 'Who else was browsing?', es: '¿Quién más estaba mirando libros?' } },
      { id: 'customer_location', category: 'CHARACTER_B_LOCATIONS', questionable: true,
        question: { en: 'Where was the other browser?', es: '¿Dónde estaba el otro visitante?' } },
      { id: 'customer_action', category: 'CHARACTER_B_ACTIONS', questionable: true,
        question: { en: 'What was the other browser doing?', es: '¿Qué estaba haciendo el otro visitante?' } },
      { id: 'prominent_object', category: 'OBJECTS_PROMINENT', questionable: true,
        question: { en: 'What caught the eye in the shop?', es: '¿Qué llamaba la atención en la tienda?' } },
      { id: 'closing_beat', category: 'CLOSING_BEATS', questionable: false },
    ],
    prose: {
      en:
        "The second-hand bookshop on the side street, {time_of_day}. " +
        "The light through the window is {weather}. " +
        "The shopkeeper, wearing a {cardigan_colour} cardigan, is {owner_action}. " +
        "On the counter, a brass carriage clock reads {clock_time}. " +
        "Along the back wall stand {shelf_count} tall shelves, each crammed to the ceiling. " +
        "{customer_descriptor}, {customer_location}, {customer_action}. " +
        "In the centre of the room sits {prominent_object}. " +
        "{closing_beat}.",
      es:
        "La librería de segunda mano de la calle lateral, {time_of_day}. " +
        "La luz por la ventana es {weather}. " +
        "El librero, con un cárdigan {cardigan_colour}, está {owner_action}. " +
        "Sobre el mostrador, un reloj de carruaje de latón marca las {clock_time}. " +
        "A lo largo de la pared del fondo hay {shelf_count} estanterías altas, cada una llena hasta el techo. " +
        "{customer_descriptor}, {customer_location}, {customer_action}. " +
        "En el centro de la sala se encuentra {prominent_object}. " +
        "{closing_beat}.",
    },
  },

  {
    id: 'park_bench',
    title: { en: 'A bench in the park', es: 'Un banco en el parque' },
    slots: [
      { id: 'weather', category: 'WEATHER_AMBIENCE', questionable: false },
      { id: 'time_of_day', category: 'TIMES_OF_DAY', questionable: true,
        question: { en: 'What time of day was it?', es: '¿En qué momento del día era?' } },
      { id: 'scarf_colour', category: 'COLOURS_PRIMARY', questionable: true,
        question: { en: 'What colour was your scarf?', es: '¿De qué color era tu bufanda?' } },
      { id: 'protagonist_action', category: 'CHARACTER_A_ACTIONS', questionable: true,
        question: { en: 'What were you doing on the bench?', es: '¿Qué estabas haciendo en el banco?' } },
      { id: 'clock_time', category: 'TIMES_ON_CLOCK', questionable: true,
        question: { en: 'What time did the church clock read?', es: '¿Qué hora marcaba el reloj de la iglesia?' } },
      { id: 'pigeon_count', category: 'NUMBERS_TABLE', questionable: true,
        question: { en: 'How many pigeons were at your feet?', es: '¿Cuántas palomas había a tus pies?' } },
      { id: 'stranger_descriptor', category: 'CHARACTER_B_DESCRIPTORS', questionable: true,
        question: { en: 'Who else was in the park?', es: '¿Quién más estaba en el parque?' } },
      { id: 'stranger_location', category: 'CHARACTER_B_LOCATIONS', questionable: true,
        question: { en: 'Where was the other person?', es: '¿Dónde estaba la otra persona?' } },
      { id: 'stranger_action', category: 'CHARACTER_B_ACTIONS', questionable: true,
        question: { en: 'What was the other person doing?', es: '¿Qué estaba haciendo la otra persona?' } },
      { id: 'prominent_object', category: 'OBJECTS_PROMINENT', questionable: true,
        question: { en: 'What landmark stood near the bench?', es: '¿Qué punto de referencia había cerca del banco?' } },
      { id: 'closing_beat', category: 'CLOSING_BEATS', questionable: false },
    ],
    prose: {
      en:
        "The small park near your flat, {time_of_day}. " +
        "The light overhead is {weather}. " +
        "You sit on a green-painted bench, a {scarf_colour} scarf around your neck, {protagonist_action}. " +
        "Across the path, the church clock reads {clock_time}. " +
        "At your feet, {pigeon_count} pigeons gather hopefully. " +
        "{stranger_descriptor}, {stranger_location}, {stranger_action}. " +
        "A short walk from the bench stands {prominent_object}. " +
        "{closing_beat}.",
      es:
        "El pequeño parque cerca de tu casa, {time_of_day}. " +
        "La luz arriba es {weather}. " +
        "Estás en un banco pintado de verde, con una bufanda {scarf_colour} al cuello, {protagonist_action}. " +
        "Al otro lado del camino, el reloj de la iglesia marca las {clock_time}. " +
        "A tus pies se reúnen esperanzadas {pigeon_count} palomas. " +
        "{stranger_descriptor}, {stranger_location}, {stranger_action}. " +
        "A unos pasos del banco se alza {prominent_object}. " +
        "{closing_beat}.",
    },
  },
];

/** Resolve a template by id, with a defensive fallback so a future
 *  rotation reshuffle that requested an unknown id doesn't throw. */
export function getTemplateById(id: TemplateId): SceneTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
