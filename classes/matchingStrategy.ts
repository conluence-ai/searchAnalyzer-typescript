import { MatchResult } from "../interface/searchInterface";
import TextMatcher from "./textMatcher";

// Define algorithm priorities and reliability scores
enum AlgorithmPriority {
  EXACT = 1,
  JARO_WINKLER = 2,
  LEVENSHTEIN = 3,
  SOUNDEX = 4
}

interface AlgorithmConfig {
  priority: AlgorithmPriority;
  reliability: number; 
  minThreshold: number; 
}

class MatchingStrategy {
  private matchers: TextMatcher[];
  private debugMode: boolean;
  private algorithmConfigs: Map<string, AlgorithmConfig>;

  constructor(debug: boolean = false) {
    this.matchers = [];
    this.debugMode = debug;
    this.algorithmConfigs = new Map<string, AlgorithmConfig>()
    this.initializeAlgorithmConfigs();
  }

  private initializeAlgorithmConfigs(): void {
    this.algorithmConfigs = new Map([
      ['Exact', {
        priority: AlgorithmPriority.EXACT,
        reliability: 1.0,
        minThreshold: 1.0
      }],
      ['JaroWinkler', {
        priority: AlgorithmPriority.JARO_WINKLER,
        reliability: 0.85,
        minThreshold: 0.8
      }],
      ['Levenshtein', {
        priority: AlgorithmPriority.LEVENSHTEIN,
        reliability: 0.75,
        minThreshold: 0.7
      }],
      ['SoundEx', {
        priority: AlgorithmPriority.SOUNDEX,
        reliability: 0.6,
        minThreshold: 0.5
      }]
    ]);
  }

  addMatcher(matcher: TextMatcher): void {
    this.matchers.push(matcher);
  }

  private calculateWeightedScore(match: MatchResult): number {
    const config = this.algorithmConfigs.get(match.algorithm);
    if (!config) {
      return match.score; // Fallback to original score
    }

    // Weight the score by algorithm reliability
    return match.score * config.reliability;
  }

  private compareMatches(a: MatchResult, b: MatchResult): number {
    const configA = this.algorithmConfigs.get(a.algorithm);
    const configB = this.algorithmConfigs.get(b.algorithm);

    // If we don't have config for either, fall back to score comparison
    if (!configA || !configB) {
      return b.score - a.score;
    }

    // 1. First priority: Algorithm type (Exact always wins)
    const priorityDiff = configA.priority - configB.priority;
    if (priorityDiff !== 0) {
      return priorityDiff; // Lower priority number = higher priority
    }

    // 2. Second priority: For same algorithm type, compare weighted scores
    const weightedScoreA = this.calculateWeightedScore(a);
    const weightedScoreB = this.calculateWeightedScore(b);
    
    const scoreDiff = weightedScoreB - weightedScoreA;
    if (Math.abs(scoreDiff) > 0.001) { // Use small epsilon for floating point comparison
      return scoreDiff;
    }

    // 3. Third priority: Original score (tie-breaker)
    return b.score - a.score;
  }

  private filterByThreshold(matches: MatchResult[]): MatchResult[] {
    return matches.filter(match => {
      const config = this.algorithmConfigs.get(match.algorithm);
      if (!config) {
        return match.score >= 0.5; // Default threshold
      }
      return match.score >= config.minThreshold;
    });
  }

  private groupMatchesByPriority(matches: MatchResult[]): Map<AlgorithmPriority, MatchResult[]> {
    const grouped = new Map<AlgorithmPriority, MatchResult[]>();
    
    matches.forEach(match => {
      const config = this.algorithmConfigs.get(match.algorithm);
      const priority = config?.priority || AlgorithmPriority.SOUNDEX; // Default to lowest priority
      
      if (!grouped.has(priority)) {
        grouped.set(priority, []);
      }
      grouped.get(priority)!.push(match);
    });

    return grouped;
  }

  findBestMatch(words: string, terms: string[], canonicalMap: Map<string, string>): MatchResult | null {
    // Early return for very short words (likely not meaningful)
    if (words.length < 2) {
      return null;
    }

    const potentialMatches: MatchResult[] = [];

    // Collect matches from all matchers
    for (const matcher of this.matchers) {
      const match = matcher.findMatch(words, terms, canonicalMap);
      if (match) {
        potentialMatches.push(match);
      }
    }

    if (potentialMatches.length === 0) {
      return null;
    }

    // Filter matches by their algorithm-specific thresholds
    const filteredMatches = this.filterByThreshold(potentialMatches);
    
    if (filteredMatches.length === 0) {
      if (this.debugMode) {
        console.log(`All matches filtered out by thresholds for word: "${words}"`);
      }
      return null;
    }

    // Group matches by algorithm priority
    const groupedMatches = this.groupMatchesByPriority(filteredMatches);
    
    if (this.debugMode) {
      console.log(`Found ${filteredMatches.length} matches for "${words}":`, filteredMatches.map(m => 
        `${m.algorithm}(${m.score.toFixed(3)}) -> ${m.canonicalForm}`
      ));
    }

    // Process groups in priority order (exact first, then fuzzy algorithms)
    const priorities = Array.from(groupedMatches.keys()).sort((a, b) => a - b);
    
    for (const priority of priorities) {
      const matchesInGroup = groupedMatches.get(priority)!;
      
      if (priority === AlgorithmPriority.EXACT) {
        // For exact matches, just return the first one (they should all be score 1.0)
        const exactMatch = matchesInGroup[0];
        if (this.debugMode) {
          console.log(`[EXACT MATCH] "${exactMatch.word}" => "${exactMatch.canonicalForm}"`);
        }
        return exactMatch;
      } else {
        // For fuzzy matches, find the best one in this priority group
        matchesInGroup.sort((a, b) => this.compareMatches(a, b));
        const bestInGroup = matchesInGroup[0];
        
        // Apply stricter thresholds for fuzzy matches based on word length
        const minFuzzyScore = this.getMinFuzzyScore(words);
        
        if (bestInGroup.score >= minFuzzyScore) {
          if (this.debugMode) {
            console.log(`[BEST FUZZY MATCH] "${bestInGroup.word}" => "${bestInGroup.canonicalForm}" (${bestInGroup.algorithm}, score: ${bestInGroup.score.toFixed(3)})`);
          }
          return bestInGroup;
        } else if (this.debugMode) {
          console.log(`[REJECTED] Best fuzzy match "${bestInGroup.word}" => "${bestInGroup.canonicalForm}" (${bestInGroup.algorithm}, score: ${bestInGroup.score.toFixed(3)}) below threshold ${minFuzzyScore}`);
        }
      }
    }

    if (this.debugMode) {
      console.log(`No suitable matches found for "${words}" after applying all filters and priorities`);
    }

    return null;
  }

  private getMinFuzzyScore(word: string): number {
    // Adaptive threshold based on word length
    // Longer words can tolerate slightly lower scores
    if (word.length <= 3) return 0.9;
    if (word.length <= 5) return 0.85;
    if (word.length <= 8) return 0.8;
    return 0.75;
  }

  // Method to get algorithm statistics for debugging/monitoring
  getAlgorithmStats(): Map<string, AlgorithmConfig> {
    return new Map(this.algorithmConfigs);
  }

  // Method to update algorithm configuration at runtime
  updateAlgorithmConfig(algorithm: string, config: Partial<AlgorithmConfig>): void {
    const existingConfig = this.algorithmConfigs.get(algorithm);
    if (existingConfig) {
      this.algorithmConfigs.set(algorithm, { ...existingConfig, ...config });
    }
  }

  // Enhanced method that returns multiple candidate matches for analysis
  findTopMatches(words: string, terms: string[], canonicalMap: Map<string, string>, topN: number = 3): MatchResult[] {
    if (words.length < 2) {
      return [];
    }

    const potentialMatches: MatchResult[] = [];

    for (const matcher of this.matchers) {
      const match = matcher.findMatch(words, terms, canonicalMap);
      if (match) {
        potentialMatches.push(match);
      }
    }

    const filteredMatches = this.filterByThreshold(potentialMatches);
    filteredMatches.sort((a, b) => this.compareMatches(a, b));

    return filteredMatches.slice(0, topN);
  }
}

export default MatchingStrategy;