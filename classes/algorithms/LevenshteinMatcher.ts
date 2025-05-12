import * as natural from "natural";
import { MatchResult } from "../../interface/searchInterface";
import TextMatcher from "../textMatcher";


class LevenshteinMatcher extends TextMatcher {
    findMatch(word: string, terms: string[], canonicalMap: Map<string, string>): MatchResult | null {
        let bestMatch = '';
        let bestDistance = Infinity;
        let bestScore = 0;

        for(const term of terms){
            if (Math.abs(term.length - word.length) > 3) continue;

            const distance = natural.LevenshteinDistance(word, term, {
                insertion_cost: 1,
                deletion_cost: 1,
                substitution_cost: 1
              });

              const maxPossibleDistance = Math.max(word.length, term.length);
              const normalizedScore = 1 - (distance / maxPossibleDistance);

              if (this.debugMode && distance <= 2) {
                console.log(`[Leven] "${word}" vs "${term}": distance=${distance}, score=${normalizedScore.toFixed(3)}`);
              }
              
              if (distance < bestDistance) {
                bestDistance = distance;
                bestMatch = term;
                bestScore = normalizedScore;
              }

              const maxAllowedDistance = Math.max(1, Math.floor(word.length / 3));

              if (bestMatch && bestDistance <= maxAllowedDistance) {
                const canonicalForm = canonicalMap.get(bestMatch) || bestMatch;
                                   
                return {
                  word,
                  match: bestMatch,
                  canonicalForm,
                  score: bestScore,
                  algorithm: 'Levenshtein'
                };
              }
        }
        return null;
    }
}

export default LevenshteinMatcher;