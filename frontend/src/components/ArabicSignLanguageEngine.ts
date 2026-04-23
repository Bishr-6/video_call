/**
 * ArabicSignLanguageEngine.ts
 * 
 * Inspired by:
 *  - sign-language-translator (ConcatenativeSynthesis model)
 *  - Arabic-sign-language-classification (Rolling Average + Letter-to-Word)
 * 
 * Provides: Text preprocessing, grammatical restructuring for ArSL,
 *           rolling-average prediction smoothing, and letter→word assembly.
 */

// ─── Complete Arabic Letters Map (from Arabic-SL-Classification repo) ───
export const ARABIC_LETTERS_MAP: Record<string, string> = {
  aleff: 'ا', bb: 'ب', taa: 'ت', thaa: 'ث', jeem: 'ج',
  haa: 'ح', khaa: 'خ', dal: 'د', thal: 'ذ', ra: 'ر',
  zay: 'ز', seen: 'س', sheen: 'ش', saad: 'ص', dhad: 'ض',
  ta: 'ط', dha: 'ظ', ain: 'ع', ghain: 'غ', fa: 'ف',
  gaaf: 'ق', kaaf: 'ك', laam: 'ل', meem: 'م', nun: 'ن',
  ha: 'ه', waw: 'و', ya: 'ئ', toot: 'ة', al: 'ال',
  la: 'لا', yaa: 'ي',
}

// ─── Rolling Average Smoother (from Arabic-SL-Classification) ───
export class PredictionSmoother {
  private buffer: number[][] = []
  private maxLen: number

  constructor(maxLen = 16) {
    this.maxLen = maxLen
  }

  /** Push a new probability vector and return the smoothed argmax index */
  push(probabilities: number[]): number {
    this.buffer.push(probabilities)
    if (this.buffer.length > this.maxLen) this.buffer.shift()

    // Average all buffered probabilities
    const avg = new Array(probabilities.length).fill(0)
    for (const p of this.buffer) {
      for (let i = 0; i < p.length; i++) avg[i] += p[i]
    }
    for (let i = 0; i < avg.length; i++) avg[i] /= this.buffer.length

    // Return index of highest average
    return avg.indexOf(Math.max(...avg))
  }

  reset() {
    this.buffer = []
  }
}

// ─── Letter-to-Word Assembler (from Arabic-SL-Classification) ───
// Common Arabic words dictionary for matching assembled letters
const ARABIC_DICTIONARY = new Set([
  'مرحبا', 'شكرا', 'أحبك', 'مدرسة', 'بيت', 'ماء', 'أكل', 'نعم', 'لا',
  'أب', 'أم', 'أخ', 'أخت', 'صديق', 'كتاب', 'قلم', 'باب', 'سيارة',
  'مسجد', 'طعام', 'حليب', 'خبز', 'سمك', 'لحم', 'رز', 'فاكهة',
  'تفاح', 'موز', 'برتقال', 'عصير', 'شاي', 'قهوة', 'حلو', 'مالح',
  'حار', 'بارد', 'كبير', 'صغير', 'جميل', 'سريع', 'بطيء',
  'يمين', 'يسار', 'فوق', 'تحت', 'أمام', 'خلف', 'قريب', 'بعيد',
  'صباح', 'مساء', 'ليل', 'نهار', 'يوم', 'أسبوع', 'شهر', 'سنة',
  'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
])

export function assembleLettersToWords(classifiedLetters: string[]): string {
  let sentence = ''
  let lastLetter = ''
  const words: string[] = []

  for (const rawLetter of classifiedLetters) {
    const letter = ARABIC_LETTERS_MAP[rawLetter] || rawLetter
    // Skip consecutive duplicates (flickering)
    if (letter === lastLetter) { lastLetter = letter; continue }
    sentence += letter
    // Check if accumulated letters form a known word
    if (ARABIC_DICTIONARY.has(sentence)) {
      words.push(sentence)
      sentence = ''
    }
    lastLetter = letter
  }

  // Add any remaining partial word
  if (sentence) words.push(sentence)
  return words.join(' ')
}

// ─── Sign Mapping for Engine ───
export interface SignMapping {
  arabic: string
  signId: string
  category: string
}

// ─── Main Engine (from sign-language-translator ConcatenativeSynthesis) ───
export class ArabicSignLanguageEngine {
  private dictionary: Map<string, SignMapping> = new Map()

  constructor(initialData: SignMapping[]) {
    initialData.forEach(item => this.dictionary.set(item.arabic, item))
  }

  /** Remove Arabic diacritics and normalize whitespace */
  private preprocess(text: string): string {
    return text
      .replace(/[\u064B-\u0652]/g, '') // Harakat
      .replace(/\s+/g, ' ')
      .trim()
  }

  /** Split sentence into tokens */
  private tokenize(sentence: string): string[] {
    return sentence.split(' ')
  }

  /**
   * Restructure Arabic SVO → Sign Language SOV order.
   * Sign languages typically follow Subject-Object-Verb.
   */
  private restructure(tokens: string[]): string[] {
    const subjects = ['أنا', 'نحن', 'أنت', 'أنتم', 'هو', 'هي', 'هم']
    const verbs = ['يذهب', 'أذهب', 'يأكل', 'آكل', 'يشرب', 'أشرب', 'يحب', 'يريد',
                   'يكتب', 'يقرأ', 'يلعب', 'يعمل', 'ينام', 'يصلي', 'يدرس', 'يسافر']
    const prepositions = ['إلى', 'في', 'على', 'من', 'عن', 'عند', 'مع']

    let subject = ''
    let verb = ''
    const objects: string[] = []

    tokens.forEach(token => {
      if (subjects.includes(token)) subject = token
      else if (verbs.includes(token)) verb = token
      else if (!prepositions.includes(token)) objects.push(token)
    })

    const result: string[] = []
    if (subject) result.push(subject)
    result.push(...objects)
    if (verb) result.push(verb)

    return result.length > 0 ? result : tokens
  }

  /** Refine raw gesture words into a natural Arabic sentence */
  refine(rawText: string): string {
    let polished = rawText
    const replacements: Record<string, string> = {
      'أنا يذهب': 'أنا ذاهب إلى',
      'أنا يحب': 'أنا أحب',
      'أنا يريد': 'أنا أريد',
      'أنا يأكل': 'أنا آكل',
      'أنا يشرب': 'أنا أشرب',
      'أمي يعمل': 'أمي تعمل في',
      'أبي ينام': 'أبي نائم الآن',
      'هو يذهب': 'هو ذاهب إلى',
      'هي يعمل': 'هي تعمل في',
    }
    Object.entries(replacements).forEach(([key, val]) => {
      if (polished.includes(key)) polished = polished.replace(key, val)
    })
    return polished
  }

  /** Translate text → sequence of sign identifiers */
  translate(text: string): string[] {
    const clean = this.preprocess(text)
    const tokens = this.tokenize(clean)
    const restructured = this.restructure(tokens)
    return restructured
      .map(token => {
        const mapping = this.dictionary.get(token)
        return mapping ? mapping.signId : token
      })
      .filter(Boolean)
  }
}
