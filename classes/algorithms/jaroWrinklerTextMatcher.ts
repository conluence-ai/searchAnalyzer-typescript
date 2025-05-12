import { MatchResult } from "../../interface/searchInterface";
import TextMatcher from "../textMatcher";
import * as natural from "natural";

class JaroWrinklerMatcher extends TextMatcher{
    private readonly SIMILARITY_THRESHOLD = 0.8;

    findMatch(word: string, terms: string[], canonicalMap: Map<string, string>): MatchResult | null {
         let bestMatch = ''
        let bestScore = 0;

        for (const term of terms) {
            const score = natural.JaroWinklerDistance(word, term, {ignoreCase: true});

            if (score > bestScore) {
                bestScore = score;
                bestMatch = term;
            }
            if (this.debugMode) {
                if (score > 0.6) {
                  console.log(`[Jaro] "${word}" vs "${term}": ${score.toFixed(3)}`);
                }
              }
        }
        if (bestScore >= this.SIMILARITY_THRESHOLD) {
            const canonicalForm = canonicalMap.get(bestMatch) || bestMatch;
            if (this.debugMode) {
                console.log(`[Jaro-Wrinkler] Found match: "${word}" => "${bestMatch}" (score: ${bestScore.toFixed(3)})`);
            }
            return {
                word,
                match: bestMatch,
                canonicalForm,
                score: bestScore,
                algorithm: 'Jaro-Wrinkler'
            };
        }
        return null;
    }
}

export default JaroWrinklerMatcher;