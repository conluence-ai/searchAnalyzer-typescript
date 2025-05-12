import * as natural from  "natural";
import TextMatcher from "../textMatcher";
import { MatchResult } from "../../interface/searchInterface";

class ExactMatcher extends TextMatcher{
    findMatch(phrase: string, terms: string[], canonicalMap: Map<string, string>): MatchResult | null {
        if (canonicalMap.has(phrase)) {
          const canonicalForm = canonicalMap.get(phrase) || phrase;
          
          if (this.debugMode) {
            console.log(`[Exact] Found exact match: "${phrase}" => "${canonicalForm}"`);
          }
          
          return {
            word: phrase,
            match: phrase,
            canonicalForm,
            score: 1.0,
            algorithm: 'Exact'
          };
        }
        
        return null;
      }
}

export default ExactMatcher;