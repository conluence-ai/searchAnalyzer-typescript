import { MatchResult } from "../interface/searchInterface";
import TextMatcher from "./textMatcher";

class MatchingStrategy {
  private matchers: TextMatcher[];
  private debugMode: boolean;

  constructor(debug: boolean = false) {
    this.matchers = [];
    this.debugMode = debug;
  }

  addMatcher(matcher: TextMatcher): void {
    this.matchers.push(matcher);
  }

  findBestMatch(words: string, terms: string[], canonicalMap: Map<string, string>): MatchResult | null {
    const potentialMatches: MatchResult[] = [];

    if (words.length < 3) {
      return null;
    }

    for (const matcher of this.matchers) {
      const match = matcher.findMatch(words, terms, canonicalMap);
      if (match) {
        potentialMatches.push(match);
      }
    }

    potentialMatches.sort((a, b) => b.score - a.score);

    if (this.debugMode && potentialMatches.length > 0) {
      console.log("All potential matches:", potentialMatches);
    }

    if (potentialMatches.length > 0) {
      const bestMatch = potentialMatches[0];
      if (this.debugMode) {
        console.log(`[Best Match] "${bestMatch.word}" => "${bestMatch.canonicalForm}" (${bestMatch.algorithm}, score: ${bestMatch.score.toFixed(3)})`);
      }
      return bestMatch;
    }

    return null;
  }
}

export default MatchingStrategy;