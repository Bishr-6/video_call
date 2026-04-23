/**
 * ArabicSignLanguageEngine.ts
 * A port of the Concatenative Synthesis logic from the Sign Language Translator repo,
 * customized for Arabic and Emirati Sign Language.
 */

export interface SignMapping {
  arabic: string;
  signId: string;
  category: string;
}

export class ArabicSignLanguageEngine {
  private dictionary: Map<string, SignMapping> = new Map();

  constructor(initialData: SignMapping[]) {
    initialData.forEach(item => this.dictionary.set(item.arabic, item));
  }

  /**
   * Preprocesses Arabic text (removes diacritics, extra spaces, etc.)
   */
  private preprocess(text: string): string {
    return text
      .replace(/[\u064B-\u0652]/g, "") // Remove Harakat
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Tokenizes sentence into words
   */
  private tokenize(sentence: string): string[] {
    return sentence.split(" ");
  }

  /**
   * Restructures Arabic sentence for Sign Language (Simplified SOV or similar)
   * Example: "أنا أذهب إلى المدرسة" -> "أنا مدرسة ذهب"
   */
  private restructure(tokens: string[]): string[] {
    // Basic rule: Subject + Object + Verb
    // This is a simplified version of what's in the Python repo
    let subject = "";
    let verb = "";
    let objects: string[] = [];

    const commonVerbs = ["يذهب", "أذهب", "يأكل", "أشرب", "يحب", "يريد"];
    const prepositions = ["إلى", "في", "على", "من", "عن"];

    tokens.forEach(token => {
      if (token === "أنا" || token === "نحن") subject = token;
      else if (commonVerbs.some(v => token.includes(v))) verb = token;
      else if (!prepositions.includes(token)) objects.push(token);
    });

    const result = [];
    if (subject) result.push(subject);
    result.push(...objects);
    if (verb) result.push(verb);

    return result.length > 0 ? result : tokens;
  }

  /**
   * Translates text to a sequence of sign identifiers
   */
  public translate(text: string): string[] {
    const cleanText = this.preprocess(text);
    const tokens = this.tokenize(cleanText);
    const restructured = this.restructure(tokens);
    
    return restructured
      .map(token => this.dictionary.get(token)?.signId || token)
      .filter(id => !!id);
  }
}
