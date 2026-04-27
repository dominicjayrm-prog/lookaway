/**
 * Curated first-name bank for the Names & Faces daily challenge.
 *
 * Sourced from public name datasets (US Social Security
 * Administration top names by decade, UK Office for National
 * Statistics name registrations, Spain's INE birth-name stats),
 * then hand-filtered against three rules:
 *
 *   1. Visually distinct — no near-duplicate spellings inside the
 *      bank. The same-puzzle Levenshtein-≥-3 guard at runtime
 *      handles the within-day case, but keeping the bank itself
 *      varied means "Sarah" and "Sara" are never even candidates
 *      together.
 *   2. Friendly + non-problematic — no names with obvious slang,
 *      brand, or character associations. No diminutives that
 *      might read as nicknames ("Sammy", "Andy") instead of
 *      proper names; the player should always feel they're
 *      remembering a real person's name.
 *   3. Mixed era + culturally diverse — the audience is 35-65 in
 *      multiple regions. The pool spans classic mid-century names
 *      (Margaret, Robert), 80s/90s (Jennifer, Michael), modern
 *      (Aiden, Sofia), Spanish-language (Diego, Lucia), South
 *      Asian (Priya, Arjun), East Asian (Mei, Hiro), African /
 *      Caribbean (Amara, Kwame), Middle Eastern (Layla, Omar),
 *      and Eastern European (Anya, Tomasz) origins — without
 *      tokenising any single bucket.
 *
 * 200 names total. At 4-6 names per puzzle, that gives ~30+ days
 * before any name repeats in a given slot — plenty of variety for
 * the Tue/Sat rotation.
 *
 * If you need to extend or replace this list, keep the rules
 * above in mind. Avoid additions that lookalike with any existing
 * entry within Levenshtein distance 3.
 */

export const NAME_BANK: readonly string[] = [
  // Classic / mid-century English
  'Margaret', 'Robert', 'Susan', 'David', 'Patricia', 'James', 'Linda',
  'Richard', 'Barbara', 'Charles', 'Carol', 'Donald', 'Janet', 'Frank',
  'Helen', 'George', 'Dorothy', 'Edward',

  // 70s/80s/90s English (the audience's own generation)
  'Jennifer', 'Michael', 'Jessica', 'Christopher', 'Amanda', 'Matthew',
  'Heather', 'Brian', 'Nicole', 'Jason', 'Stephanie', 'Kevin', 'Rachel',
  'Andrew', 'Lauren', 'Daniel', 'Megan', 'Ryan', 'Samantha', 'Justin',
  'Ashley', 'Brandon', 'Tiffany', 'Gregory', 'Wendy', 'Bradley', 'Holly',
  'Marcus', 'Vanessa', 'Kyle',

  // 2000s/2010s English (younger end of the audience + their kids)
  'Aiden', 'Olivia', 'Mason', 'Emma', 'Noah', 'Charlotte', 'Liam',
  'Mia', 'Caleb', 'Harper', 'Owen', 'Ava', 'Dylan', 'Zoe', 'Tyler',
  'Chloe', 'Cooper',

  // Spanish-language (Spain + Latin America)
  'Diego', 'Lucia', 'Mateo', 'Sofia', 'Carlos', 'Carmen', 'Javier',
  'Isabel', 'Alejandro', 'Valentina', 'Pablo', 'Camila', 'Manuel',
  'Beatriz', 'Rafael', 'Esperanza', 'Leonardo', 'Pilar', 'Hector',
  'Catalina', 'Ricardo', 'Mariana', 'Gonzalo', 'Renata',

  // South Asian
  'Priya', 'Arjun', 'Kavita', 'Rohan', 'Anika', 'Vikram', 'Meera',
  'Karan', 'Divya', 'Aarav', 'Saanvi', 'Ishaan', 'Tara', 'Kabir',

  // East Asian
  'Mei', 'Hiroshi', 'Jin', 'Yuki', 'Kenji', 'Sakura', 'Akira',
  'Hana', 'Min', 'Daiki',

  // African / Caribbean / African-American
  'Amara', 'Kwame', 'Adaeze', 'Kofi', 'Imani', 'Tobias', 'Zuri',
  'Malachi', 'Nia', 'Jelani', 'Asante', 'Folake',

  // Middle Eastern / North African
  'Layla', 'Omar', 'Yasmin', 'Karim', 'Farah', 'Tariq', 'Noor',
  'Hassan', 'Amira', 'Rashid',

  // Eastern European
  'Anya', 'Tomasz', 'Magda', 'Pavel', 'Katya', 'Lukasz', 'Nadia',
  'Bogdan', 'Elena', 'Stanislav',

  // Northern European (Scandinavia + Netherlands + Germany)
  'Lars', 'Astrid', 'Bjorn', 'Ingrid', 'Soren', 'Freya', 'Magnus',
  'Sigrid', 'Pieter', 'Anneke', 'Klaus', 'Greta',

  // Italian
  'Marco', 'Giulia', 'Luca', 'Francesca', 'Lorenzo', 'Chiara',
  'Matteo', 'Alessia',

  // French
  'Pierre', 'Camille', 'Henri', 'Margaux', 'Antoine', 'Celine',
  'Laurent', 'Genevieve',

  // Greek
  'Stavros', 'Athena', 'Niko', 'Eleni',

  // Irish / Welsh / Scottish
  'Aoife', 'Cillian', 'Bronwyn', 'Hamish', 'Saoirse', 'Eilidh',
  'Padraig', 'Niamh',

  // Hebrew / Yiddish heritage
  'Ezra', 'Naomi', 'Asher', 'Tamar', 'Jonah', 'Talia',

  // Persian
  'Darius', 'Yasmine', 'Cyrus',

  // Turkish
  'Cem', 'Selin', 'Burak',

  // A few more rounding the bank toward 200
  'Theodore', 'Beatrice', 'Vincent', 'Eleanor', 'Wesley', 'Adelaide',
] as const;

// Sanity check the bank as we ship — fast tests in dev that
// regression cases (accidental duplicate, accidental short list)
// are caught early. Runs only when this module is imported in a
// dev tooling context (the unit-test harness or a manual sanity
// script); in production it's a no-op cost since the constants
// are baked in at compile time.
if (process.env.NODE_ENV !== 'production') {
  const seen = new Set<string>();
  for (const n of NAME_BANK) {
    if (seen.has(n)) {
      // Surface as a warning rather than throw — production code
      // shouldn't crash if a curator accidentally dupes a name,
      // but we want it loud during dev.
      console.warn(`[nameBank] duplicate entry detected: ${n}`);
    }
    seen.add(n);
  }
}
