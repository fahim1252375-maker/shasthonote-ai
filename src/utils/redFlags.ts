/**
 * Offline, rule-based red-flag screener (English + Bangla).
 *
 * This is a safety net, NOT a diagnostic tool. It looks for phrases that commonly
 * describe emergencies (chest pain, stroke signs, heavy bleeding, ...) in text the
 * user typed, and tells them to seek urgent care. It runs entirely in the browser,
 * so it works in guest mode and never sends text anywhere.
 *
 * Known limits: keyword matching can miss unusual wording and can occasionally fire
 * on text that is not about the writer. Absence of a warning never means "safe".
 */

export type RedFlagSeverity = 'emergency' | 'urgent';

export interface RedFlagMatch {
  id: string;
  severity: RedFlagSeverity;
  labelEn: string;
  labelBn: string;
  adviceEn: string;
  adviceBn: string;
  matchedText: string;
}

interface RedFlagRule {
  id: string;
  /** Severity when only the base pattern matched. */
  severity: RedFlagSeverity;
  labelEn: string;
  labelBn: string;
  adviceEn?: string;
  adviceBn?: string;
  patterns: RegExp[];
  /** If any of these appear (not negated) near the match, severity becomes "emergency". */
  escalate?: RegExp[];
}

const EMERGENCY_ADVICE_EN =
  'Call 999 (Bangladesh) or your local emergency number, or go to the nearest emergency department now. Do not wait for an appointment.';
const EMERGENCY_ADVICE_BN =
  'এখনই ৯৯৯-এ কল করুন বা নিকটস্থ হাসপাতালের জরুরি বিভাগে যান। অ্যাপয়েন্টমেন্টের জন্য অপেক্ষা করবেন না।';
const URGENT_ADVICE_EN =
  'Please talk to a doctor or urgent-care service today. If it gets worse or new warning signs appear, go to the emergency department.';
const URGENT_ADVICE_BN =
  'আজই একজন ডাক্তার বা জরুরি চিকিৎসাসেবার সাথে কথা বলুন। অবস্থা খারাপ হলে বা নতুন বিপদচিহ্ন দেখা দিলে জরুরি বিভাগে যান।';

const RULES: RedFlagRule[] = [
  {
    id: 'chest_pain',
    severity: 'urgent',
    labelEn: 'Chest pain or pressure',
    labelBn: 'বুকে ব্যথা বা চাপ',
    patterns: [
      /\bchest\s+(?:pain|pressure|tightness|heaviness|discomfort)\b/iu,
      /\b(?:pain|pressure|tightness)\s+(?:in|across)\s+(?:the\s+|my\s+)?chest\b/iu,
      /বুক(?:ে|ের)\s+(?:[\p{L}\p{M}]+\s+){0,3}?(?:ব্যথা|চাপ|ভার|যন্ত্রণা|জ্বালা)/u,
    ],
    escalate: [
      /\bcrushing\b|\bsevere\b|\bradiat\w*\b|\bspreading\b/iu,
      /\b(?:left\s+arm|jaw)\b/iu,
      /\bsweat\w*\b|\bcold\s+sweat\b/iu,
      /তীব্র|বাম\s*হাত|চোয়াল|ঘেমে|ঘাম/u,
    ],
  },
  {
    id: 'breathing',
    severity: 'urgent',
    labelEn: 'Difficulty breathing',
    labelBn: 'শ্বাসকষ্ট',
    patterns: [
      /\b(?:shortness\s+of\s+breath|breathless(?:ness)?|difficulty\s+breathing|trouble\s+breathing|hard\s+to\s+breathe|gasping)\b/iu,
      /\bcan(?:'|’)?t\s+breathe\b|\bcannot\s+breathe\b/iu,
      /শ্বাসকষ্ট|শ্বাস\s*নিতে\s+(?:[\p{L}\p{M}]+\s+)?কষ্ট|দম\s*বন্ধ|শ্বাস\s*নিতে\s*পারছি\s*না|হাঁপিয়ে|হাঁপাচ্ছি/u,
    ],
    escalate: [
      /\bsevere\b|\bextreme\b|\bat\s+rest\b|\bblue\s+lips\b|\bbluish\b|\bcan(?:'|’)?t\s+speak\b/iu,
      /তীব্র|বিশ্রামে|ঠোঁট\s*নীল|কথা\s*বলতে\s*পারছি\s*না/u,
    ],
  },
  {
    id: 'stroke',
    severity: 'emergency',
    labelEn: 'Possible stroke signs',
    labelBn: 'স্ট্রোকের সম্ভাব্য লক্ষণ',
    patterns: [
      /\b(?:sudden|new)\s+(?:weakness|numbness)\s+(?:on|in)\s+(?:one\s+side|the\s+face|face|an?\s+arm|an?\s+leg|arm|leg)\b/iu,
      /\bface\s+(?:is\s+)?drooping\b|\bfacial\s+droop\w*\b|\bdrooping\s+face\b/iu,
      /\bslurred\s+speech\b|\b(?:difficulty|trouble)\s+speaking\b|\bcan(?:'|’)?t\s+speak\b/iu,
      /\bsudden\s+(?:loss\s+of\s+vision|vision\s+loss|blindness)\b/iu,
      /\bworst\s+headache\s+of\s+(?:my|her|his|their)\s+life\b|\bthunderclap\s+headache\b/iu,
      /মুখ\s*বেঁকে|কথা\s*জড়িয়ে|কথা\s*বলতে\s*(?:কষ্ট|পারছি\s*না)|এক\s*পাশ(?:ে|ের)?\s*(?:অবশ|দুর্বল)|হঠাৎ\s*(?:দৃষ্টি|দেখতে)/u,
    ],
  },
  {
    id: 'severe_bleeding',
    severity: 'emergency',
    labelEn: 'Heavy or unusual bleeding',
    labelBn: 'প্রচুর বা অস্বাভাবিক রক্তক্ষরণ',
    patterns: [
      /\b(?:heavy|severe|uncontrolled|profuse)\s+bleeding\b/iu,
      /\bbleeding\s+(?:that\s+)?(?:won(?:'|’)?t|will\s+not|does\s+not|doesn(?:'|’)?t)\s+stop\b/iu,
      /\bvomit\w*\s+(?:up\s+)?blood\b|\bcough\w*\s+(?:up\s+)?blood\b|\bblood\s+in\s+(?:the\s+)?(?:stool|vomit)\b|\bblack,?\s+tarry\s+stool\w*\b/iu,
      /রক্ত\s*বমি|কাশি(?:তে|র\s*সাথে)\s*রক্ত|প্রচুর\s*রক্ত|রক্তক্ষরণ\s*বন্ধ\s*হচ্ছে\s*না|কালো\s*(?:আলকাতরার\s*মতো\s*)?পায়খানা/u,
    ],
  },
  {
    id: 'seizure_unconscious',
    severity: 'emergency',
    labelEn: 'Seizure or loss of consciousness',
    labelBn: 'খিঁচুনি বা জ্ঞান হারানো',
    patterns: [
      /\b(?:seizure|convulsion|unconscious|unresponsive|not\s+waking\s+up|loss\s+of\s+consciousness)\w*\b/iu,
      /খিঁচুনি|অজ্ঞান|জ্ঞান\s*হারি/u,
    ],
  },
  {
    id: 'fainting',
    severity: 'urgent',
    labelEn: 'Fainting or near-fainting',
    labelBn: 'মাথা ঘুরে পড়ে যাওয়া বা অজ্ঞান হওয়ার মতো অনুভূতি',
    patterns: [
      /\b(?:fainted|fainting|passed\s+out|blacked\s+out|blackout)\b/iu,
      /মাথা\s*ঘুরে\s*পড়ে|চোখে\s*অন্ধকার/u,
    ],
  },
  {
    id: 'allergic_reaction',
    severity: 'emergency',
    labelEn: 'Severe allergic reaction signs',
    labelBn: 'তীব্র অ্যালার্জির লক্ষণ',
    patterns: [
      /\b(?:throat|tongue|lips?|face)\s+(?:is\s+|are\s+)?(?:swelling|swollen)\b|\bswelling\s+of\s+(?:the\s+)?(?:throat|tongue|lips|face)\b|\banaphyla\w*\b/iu,
      /গলা\s*(?:ফুলে|বন্ধ)|জিহ্বা\s*ফুলে|ঠোঁট\s*ফুলে|মুখ\s*ফুলে/u,
    ],
  },
  {
    id: 'self_harm',
    severity: 'emergency',
    labelEn: 'Thoughts of self-harm',
    labelBn: 'নিজের ক্ষতি করার চিন্তা',
    adviceEn:
      'You deserve support right now. Please contact emergency services (999 in Bangladesh) or a trusted person near you, and stay with someone until you can talk to a professional.',
    adviceBn:
      'এই মুহূর্তে আপনার সহায়তা দরকার। অনুগ্রহ করে ৯৯৯-এ বা আপনার বিশ্বস্ত কাউকে জানান, এবং কোনো পেশাদারের সাথে কথা বলা পর্যন্ত কারও সাথে থাকুন।',
    patterns: [
      /\b(?:suicid(?:e|al)|kill\s+myself|end\s+my\s+life|want\s+to\s+die|self[- ]harm|hurt\s+myself|harm\s+myself)\b/iu,
      /আত্মহত্যা|মরে\s*যেতে\s*চাই|নিজেকে\s*শেষ|নিজের\s*ক্ষতি/u,
    ],
  },
  {
    id: 'poisoning_overdose',
    severity: 'emergency',
    labelEn: 'Poisoning or overdose',
    labelBn: 'বিষক্রিয়া বা ওষুধের ওভারডোজ',
    patterns: [
      /\boverdos\w*\b|\bpoison(?:ed|ing)?\b|\bswallowed\s+(?:a\s+lot\s+of|too\s+many)\b/iu,
      /বিষ\s*খেয়ে|বেশি\s*ওষুধ\s*খেয়ে|ওভারডোজ/u,
    ],
  },
  {
    id: 'pregnancy_emergency',
    severity: 'emergency',
    labelEn: 'Pregnancy warning sign',
    labelBn: 'গর্ভাবস্থার বিপদচিহ্ন',
    patterns: [
      /\b(?:bleeding|severe\s+pain|no\s+fetal\s+movement|reduced\s+fetal\s+movement)\s+(?:during|in)\s+pregnancy\b/iu,
      /\bpregnan\w*[^.\n]{0,60}?\b(?:heavy\s+bleeding|severe\s+(?:abdominal\s+)?pain|no\s+(?:baby\s+)?movement)\b/iu,
      /গর্ভাবস্থায়\s*(?:রক্ত|তীব্র\s*ব্যথা)/u,
    ],
  },
  {
    id: 'stiff_neck',
    severity: 'urgent',
    labelEn: 'Stiff neck',
    labelBn: 'ঘাড় শক্ত হয়ে যাওয়া',
    patterns: [/\bstiff\s+neck\b|\bneck\s+stiffness\b/iu, /ঘাড়\s*শক্ত/u],
    escalate: [/\bfever\b|\bhigh\s+temperature\b/iu, /জ্বর/u],
  },
  {
    id: 'severe_abdominal_pain',
    severity: 'urgent',
    labelEn: 'Severe abdominal pain',
    labelBn: 'তীব্র পেটে ব্যথা',
    patterns: [
      /\b(?:severe|worst|unbearable|excruciating)\s+(?:abdominal|stomach|belly)\s+pain\b/iu,
      /তীব্র\s*পেটে?\s*ব্যথা|অসহ্য\s*পেটে?\s*ব্যথা/u,
    ],
    escalate: [/\bvomit\w*\s+blood\b|\brigid\s+abdomen\b|\bblack\s+stool\b/iu, /রক্ত\s*বমি|কালো\s*পায়খানা/u],
  },
  {
    id: 'low_blood_sugar',
    severity: 'urgent',
    labelEn: 'Low blood sugar episode',
    labelBn: 'রক্তে সুগার অনেক কমে যাওয়া',
    patterns: [
      /\b(?:very|dangerously)\s+low\s+(?:blood\s+)?sugar\b|\bhypoglyc(?:a)?emi\w*\b/iu,
      /সুগার\s*(?:খুব\s*)?কমে\s*গ(?:েছে|িয়ে)/u,
    ],
    escalate: [/\bconfus\w*\b|\bunconscious\b|\bseizure\b/iu, /অজ্ঞান|খিঁচুনি|বিভ্রান্ত/u],
  },
];

// --- Negation handling -----------------------------------------------------

const CLAUSE_SPLIT = /[.,;:!?\n।]|\bbut\b|\band\b|কিন্তু|এবং/iu;
const NEGATION_BEFORE = /\b(?:no|not|without|denies|denied|never|negative\s+for|free\s+of|absence\s+of|nor|neither)\b|নেই|নাই|কোনো\s*$/iu;
const NEGATION_AFTER =
  /\b(?:denied|absent|ruled\s+out|none|resolved|not\s+present)\b|নেই|নাই|হয়নি|হচ্ছে\s*না|হয়\s*না|ছড়ায়নি|ছড়ায়\s*না|অনুভব\s*করিনি|করছি\s*না|পাইনি|ছিল\s*না/iu;

function isNegated(text: string, start: number, end: number): boolean {
  const beforeClause = text.slice(0, start).split(CLAUSE_SPLIT).pop() ?? '';
  const beforeWindow = beforeClause.slice(-40);
  const afterClause = text.slice(end).split(CLAUSE_SPLIT)[0] ?? '';
  const afterWindow = afterClause.slice(0, 50);
  return NEGATION_BEFORE.test(beforeWindow) || NEGATION_AFTER.test(afterWindow);
}

function findFirstNonNegated(text: string, pattern: RegExp): { text: string; index: number; end: number } | null {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const globalPattern = new RegExp(pattern.source, flags);
  for (const match of text.matchAll(globalPattern)) {
    const index = match.index ?? 0;
    const end = index + match[0].length;
    if (!isNegated(text, index, end)) return { text: match[0], index, end };
  }
  return null;
}

const MAX_SCAN_LENGTH = 200_000;

/**
 * Scan free text for emergency / urgent warning phrases.
 * Returns at most one match per rule, emergencies first.
 */
export function detectRedFlags(rawText: string): RedFlagMatch[] {
  if (typeof rawText !== 'string') return [];
  const text = rawText.slice(0, MAX_SCAN_LENGTH).normalize('NFC');
  if (text.trim().length < 3) return [];

  const matches: RedFlagMatch[] = [];

  for (const rule of RULES) {
    let hit: { text: string; index: number; end: number } | null = null;
    for (const pattern of rule.patterns) {
      const found = findFirstNonNegated(text, pattern);
      if (found && (!hit || found.index < hit.index)) hit = found;
    }
    if (!hit) continue;

    let severity = rule.severity;
    if (severity === 'urgent' && rule.escalate) {
      const windowStart = Math.max(0, hit.index - 60);
      const windowText = text.slice(windowStart, Math.min(text.length, hit.end + 60));
      severity = rule.escalate.some((pattern) => findFirstNonNegated(windowText, pattern) !== null)
        ? 'emergency'
        : 'urgent';
    }

    matches.push({
      id: rule.id,
      severity,
      labelEn: rule.labelEn,
      labelBn: rule.labelBn,
      adviceEn: rule.adviceEn ?? (severity === 'emergency' ? EMERGENCY_ADVICE_EN : URGENT_ADVICE_EN),
      adviceBn: rule.adviceBn ?? (severity === 'emergency' ? EMERGENCY_ADVICE_BN : URGENT_ADVICE_BN),
      matchedText: hit.text.trim().slice(0, 80),
    });
  }

  return matches.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'emergency' ? -1 : 1));
}

export function highestRedFlagSeverity(matches: RedFlagMatch[]): RedFlagSeverity | null {
  if (matches.length === 0) return null;
  return matches.some((match) => match.severity === 'emergency') ? 'emergency' : 'urgent';
}
