import { MatchResult } from '../interface/searchInterface';
abstract class TextMatcher {
    protected debugMode: boolean;
    
    constructor(debug: boolean = false) {
      this.debugMode = debug;
    }
    
    abstract findMatch(word: string, terms: string[], canonicalMap: Map<string, string>): MatchResult | null;
  }

  export default TextMatcher;