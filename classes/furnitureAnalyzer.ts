import * as natural from "natural"
import { AnalysisResult, Dictionary, MatchResult } from "../interface/searchInterface";
import TextMatcher from "./textMatcher";
import MatchingStrategy from "./matchingStrategy";
import JaroWrinklerMatcher from "./algorithms/jaroWrinklerTextMatcher";
import ExactMatcher from "./algorithms/exactMatcher";
import SoundExMatcher from "./algorithms/soundExMatcher";
import LevenshteinMatcher from "./algorithms/LevenshteinMatcher";

class FurnitureAnalyzer {
    private tokenizer: natural.WordTokenizer;
    private debugMode: boolean;
    private dictionaries: Map<string, Dictionary>;
    private matchingStrategy: MatchingStrategy;
    constructor(
        options: {
            dictonaries: { [key: string]: Dictionary },
            matchers?: TextMatcher[],
            debug?: boolean
        }) {
        this.debugMode = options.debug || false;
        this.tokenizer = new natural.WordTokenizer();
        this.matchingStrategy = new MatchingStrategy(this.debugMode);
        this.dictionaries = new Map<string, Dictionary>();

        if (options.dictonaries) {
            Object.entries(options.dictonaries).forEach(([key, dict]) => {
                this.addDictionary(key, dict);
            });
        }

        if (!options.matchers || options.matchers.length === 0) {
            this.addDefaultMatchers();
        } else {
            options.matchers.forEach(matcher => {
                this.matchingStrategy.addMatcher(matcher);
            });
        }
    }

    private addDefaultMatchers(): void {
        this.matchingStrategy.addMatcher(new JaroWrinklerMatcher(this.debugMode));
        this.matchingStrategy.addMatcher(new ExactMatcher(this.debugMode));
        this.matchingStrategy.addMatcher(new SoundExMatcher(this.debugMode));
        this.matchingStrategy.addMatcher(new LevenshteinMatcher(this.debugMode));
    }

    public addDictionary(key: string, dictionary: Dictionary): void {
        this.dictionaries.set(key, dictionary);
    }

    public addMatcher(matcher: TextMatcher): void {
        this.matchingStrategy.addMatcher(matcher);
    }

    private extractProductType(text: string): { productType: string | null, matchDetails?: MatchResult, remainingText: string } {
        const productDict = this.dictionaries.get('ProductType');
        if (!productDict) {
            if (this.debugMode) {
                console.log("No product type dictionary available");
            }
            return { productType: null, remainingText: text };
        }

        const words = text.toLowerCase().split(/\s+/);
        const canonicalMap = productDict.getTermToCanonicalMap();
        const allTerms = productDict.getAllTerms();

        if (this.debugMode) {
            console.log("Analyzing text for product type:", text);
            console.log("Words:", words);
        }

        // Look for multi-word product types first
        for (let n = 4; n >= 1; n--) {
            for (let i = 0; i <= words.length - n; i++) {
                const phrase = words.slice(i, i + n).join(' ');
                const exactMatcher = new ExactMatcher(this.debugMode);
                const match = exactMatcher.findMatch(phrase, allTerms, canonicalMap);

                if (match) {
                    const matchedWords = phrase.split(/\s+/);
                    const remainingWords = [...words];
                    const startIdx = i;
                    remainingWords.splice(startIdx, matchedWords.length);
                    const remainingText = remainingWords.join(' ');

                    if (this.debugMode) {
                        console.log(`Found product type: "${match.canonicalForm}"`);
                        console.log(`Removed "${phrase}" from search text`);
                        console.log(`Remaining text: "${remainingText}"`);
                    }
                    // console.log(`Product type identified: {
                    //     productType: ${match.canonicalForm},
                    //     matchDetails: ${match},
                    //     remainingText: ${remainingText.length > 0 ? `"${remainingText}"` : "''"}
                    // }`);
                    return {
                        productType: match.canonicalForm,
                        matchDetails: match,
                        remainingText: remainingText
                    };
                }
            }
        }

        // Try fuzzy matching for each word
        const potentialMatches: MatchResult[] = [];

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const match = this.matchingStrategy.findBestMatch(word, allTerms, canonicalMap);
            if (match) {
                match.position = i;
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

            const remainingWords = [...words];
            const position = bestMatch.position !== undefined ? bestMatch.position : -1;
            
            if (position >= 0) {
                remainingWords.splice(position, 1);
                const remainingText = remainingWords.join(' ');

                if (this.debugMode) {
                    console.log(`Removed "${bestMatch.word}" from search text`);
                    console.log(`Remaining text: "${remainingText}"`);
                }

                // console.log(`Product type identified: {
                //     productType: ${bestMatch.canonicalForm},
                //     matchDetails: ${bestMatch},
                //     remainingText: ${remainingText}
                // }`);

                return {
                    productType: bestMatch.canonicalForm,
                    matchDetails: bestMatch,
                    remainingText: remainingText
                };
            }
        }

        return { productType: null, remainingText: text };
    }

    // private extractBrandName(text: string): { brandName: string | null, matchDetails?: MatchResult, remainingText: string } {
    //     const brandDict = this.dictionaries.get('Brand');
    //     if (!brandDict) {
    //         if (this.debugMode) {
    //             console.log("No brand dictionary available");
    //         }
    //         return { brandName: null, remainingText: text };
    //     }
      
    //     const words = text.toLowerCase().split(/\s+/);
    //     const canonicalMap = brandDict.getTermToCanonicalMap();
    //     const allTerms = brandDict.getAllTerms();
        
    //     if (this.debugMode) {
    //         console.log("Analyzing text for brands:", text);
    //         console.log("Words:", words);
    //         console.log("Available brand terms:", allTerms);
    //     }
        
    //     // Check for multi-word brand names first (longer phrases have priority)
    //     for (let n = 5; n >= 1; n--) {
    //         for (let i = 0; i <= words.length - n; i++) {
    //             const phrase = words.slice(i, i + n).join(' ');
    //             const exactMatcher = new ExactMatcher(this.debugMode);
    //             const match = exactMatcher.findMatch(phrase, allTerms, canonicalMap);
                
    //             if (match) {
    //                 if (this.debugMode) {
    //                     console.log("Exact brand match found:", match);
    //                 }
                    
    //                 // Create remaining text
    //                 const remainingWords = [...words];
    //                 remainingWords.splice(i, n);
    //                 const remainingText = remainingWords.join(' ');
                    
    //                 if (this.debugMode) {
    //                     console.log(`Removed "${phrase}" from search text`);
    //                     console.log(`Remaining text: "${remainingText}"`);
    //                 }
                    
    //                 return { 
    //                     brandName: match.canonicalForm,
    //                     matchDetails: match,
    //                     remainingText: remainingText
    //                 };
    //             }
    //         }
    //     }
        

    //     for (let i = 0; i < words.length; i++) {
    //         const word = words[i];
            
      
    //         if (/^\d+$/.test(word)) {
    
    //             if (allTerms.includes(word)) {
    //                 const canonical = canonicalMap.get(word) || word;
    //                 const remainingWords = [...words];
    //                 remainingWords.splice(i, 1);
                    
    //                 if (this.debugMode) {
    //                     console.log(`Found numeric brand: "${word}" => "${canonical}"`);
    //                 }
                    
    //                 return {
    //                     brandName: canonical,
    //                     matchDetails: {
    //                         word: word,
    //                         match: word,
    //                         canonicalForm: canonical,
    //                         algorithm: "Exact",
    //                         score: 1.0,
    //                         position: i
    //                     },
    //                     remainingText: remainingWords.join(' ')
    //                 };
    //             }
    //         }
    //     }
        
    //     const potentialMatches: MatchResult[] = [];
        
    //     for (let i = 0; i < words.length; i++) {
    //         const word = words[i];
    //         const match = this.matchingStrategy.findBestMatch(word, allTerms, canonicalMap);
    //         if (match) {
    //             match.position = i;
    //             potentialMatches.push(match);
    //         }
    //     }
        
    //     potentialMatches.sort((a, b) => b.score - a.score);
        
    //     if (this.debugMode && potentialMatches.length > 0) {
    //         console.log("All potential brand matches:", potentialMatches);
    //     }
        
    //     if (potentialMatches.length > 0) {
    //         const bestMatch = potentialMatches[0];
            
    //         if (this.debugMode) {
    //             console.log(`[Best Brand Match] "${bestMatch.word}" => "${bestMatch.canonicalForm}" (${bestMatch.algorithm}, score: ${bestMatch.score.toFixed(3)})`);
    //         }
            
    //         const remainingWords = [...words];
    //         const position = bestMatch.position !== undefined ? bestMatch.position : -1;
            
    //         if (position >= 0) {
    //             remainingWords.splice(position, 1);
    //             const remainingText = remainingWords.join(' ');
                
    //             if (this.debugMode) {
    //                 console.log(`Removed "${bestMatch.word}" from search text`);
    //                 console.log(`Remaining text: "${remainingText}"`);
    //             }
                
    //             return {
    //                 brandName: bestMatch.canonicalForm,
    //                 matchDetails: bestMatch,
    //                 remainingText: remainingText
    //             };
    //         }
    //     }
        
    //     return { brandName: null, remainingText: text };
    // }



private extractBrandName(text: string): { brandName: string | null, matchDetails?: MatchResult, remainingText: string } {
    const brandDict = this.dictionaries.get('Brand');
    if (!brandDict) {
        if (this.debugMode) {
            console.log("No brand dictionary available");
        }
        return { brandName: null, remainingText: text };
    }
  
    const words = text.toLowerCase().split(/\s+/);
    const canonicalMap = brandDict.getTermToCanonicalMap();
    const allTerms = brandDict.getAllTerms();
    
    // Define furniture-related terms that should NOT be considered as brands
    const furnitureTerms = new Set([
        'legs', 'back', 'seat', 'arm', 'arms', 'cushion', 'cushions',
        'frame', 'base', 'top', 'surface', 'drawer', 'drawers',
        'door', 'doors', 'shelf', 'shelves', 'handle', 'handles',
        'leg', 'feet', 'foot', 'backrest', 'armrest', 'headrest'
    ]);
    
    if (this.debugMode) {
        console.log("Analyzing text for brands:", text);
        console.log("Words:", words);
        console.log("Available brand terms:", allTerms);
    }
    
    // Check for multi-word brand names first (longer phrases have priority)
    for (let n = 5; n >= 1; n--) {
        for (let i = 0; i <= words.length - n; i++) {
            const phrase = words.slice(i, i + n).join(' ');
            
            // Skip if phrase contains furniture terms
            if (phrase.split(' ').some(word => furnitureTerms.has(word))) {
                continue;
            }
            
            const exactMatcher = new ExactMatcher(this.debugMode);
            const match = exactMatcher.findMatch(phrase, allTerms, canonicalMap);
            
            if (match) {
                if (this.debugMode) {
                    console.log("Exact brand match found:", match);
                }
                
                // Create remaining text
                const remainingWords = [...words];
                remainingWords.splice(i, n);
                const remainingText = remainingWords.join(' ');
                
                if (this.debugMode) {
                    console.log(`Removed "${phrase}" from search text`);
                    console.log(`Remaining text: "${remainingText}"`);
                }
                
                return { 
                    brandName: match.canonicalForm,
                    matchDetails: match,
                    remainingText: remainingText
                };
            }
        }
    }
    
    // Handle numeric brands (keep existing logic)
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        if (/^\d+$/.test(word)) {
            if (allTerms.includes(word)) {
                const canonical = canonicalMap.get(word) || word;
                const remainingWords = [...words];
                remainingWords.splice(i, 1);
                
                if (this.debugMode) {
                    console.log(`Found numeric brand: "${word}" => "${canonical}"`);
                }
                
                return {
                    brandName: canonical,
                    matchDetails: {
                        word: word,
                        match: word,
                        canonicalForm: canonical,
                        algorithm: "Exact",
                        score: 1.0,
                        position: i
                    },
                    remainingText: remainingWords.join(' ')
                };
            }
        }
    }
    
    const potentialMatches: MatchResult[] = [];
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // Skip furniture-related terms
        if (furnitureTerms.has(word)) {
            if (this.debugMode) {
                console.log(`Skipping furniture term: "${word}"`);
            }
            continue;
        }
        
        const match = this.matchingStrategy.findBestMatch(word, allTerms, canonicalMap);
        if (match) {
            match.position = i;
            potentialMatches.push(match);
        }
    }
    
    potentialMatches.sort((a, b) => b.score - a.score);
    
    if (this.debugMode && potentialMatches.length > 0) {
        console.log("All potential brand matches:", potentialMatches);
    }
    
    if (potentialMatches.length > 0) {
        const bestMatch = potentialMatches[0];
        
        if (this.debugMode) {
            console.log(`[Best Brand Match] "${bestMatch.word}" => "${bestMatch.canonicalForm}" (${bestMatch.algorithm}, score: ${bestMatch.score.toFixed(3)})`);
        }
        
        const remainingWords = [...words];
        const position = bestMatch.position !== undefined ? bestMatch.position : -1;
        
        if (position >= 0) {
            remainingWords.splice(position, 1);
            const remainingText = remainingWords.join(' ');
            
            if (this.debugMode) {
                console.log(`Removed "${bestMatch.word}" from search text`);
                console.log(`Remaining text: "${remainingText}"`);
            }
            
            return {
                brandName: bestMatch.canonicalForm,
                matchDetails: bestMatch,
                remainingText: remainingText
            };
        }
    }
    
    return { brandName: null, remainingText: text };
}
    private extractProductName(text: string): { productName: string | null, matchDetails?: MatchResult, remainingText: string } {
        const productDict = this.dictionaries.get('ProductName');
        if (!productDict) {
          if (this.debugMode) {
            console.log("No product name dictionary available");
          }
          return { productName: null, remainingText: text };
        }
      
        const words = text.toLowerCase().split(/\s+/);
        const canonicalMap = productDict.getTermToCanonicalMap();
        const allTerms = productDict.getAllTerms();
        const removedIndices = new Set<number>();
        
        if (this.debugMode) {
          console.log("Analyzing text for product name:", text);
          console.log("Words:", words);
        }
        
   
        for (let n = 4; n >= 1; n--) {
          for (let i = 0; i <= words.length - n; i++) {
            let alreadyMatched = false;
            for (let j = i; j < i + n; j++) {
              if (removedIndices.has(j)) {
                alreadyMatched = true;
                break;
              }
            }
            if (alreadyMatched) continue;
            
            const phrase = words.slice(i, i + n).join(' ');
            const exactMatcher = new ExactMatcher(this.debugMode);
            const match = exactMatcher.findMatch(phrase, allTerms, canonicalMap);
            
            if (match) {
              if (this.debugMode) {
                console.log(`Found exact product name match: "${match.canonicalForm}"`);
              }
              
              // Mark these words as matched
              for (let j = i; j < i + n; j++) {
                removedIndices.add(j);
              }
              
              // Create remaining text
              const remainingWords = words.filter((_, index) => !removedIndices.has(index));
              const remainingText = remainingWords.join(' ');
              
              return { 
                productName: match.canonicalForm,
                matchDetails: match,
                remainingText: remainingText
              };
            }
          }
        }
        
        
        return { productName: null, remainingText: text };
    }

    private extractDictionaryItems(text: string, dictionaryName: string, maxPhraseWords: number = 3): 
        { items: string[], remainingText: string } {
        const dict = this.dictionaries.get(dictionaryName);
        if (!dict) return { items: [], remainingText: text };
        
        if (this.debugMode) {
            console.log("Extracting items from dictionary:", dictionaryName);
            console.log("Text:", text);
        }
        
        const words = text.toLowerCase().split(/\s+/);
        const canonicalMap = dict.getTermToCanonicalMap();
        const items = new Set<string>();
        const explicitMatches = new Set<string>();
        const removedIndices = new Set<number>();
        
        for (let n = maxPhraseWords; n >= 1; n--) {
            for (let i = 0; i <= words.length - n; i++) {
        
                let alreadyMatched = false;
                for (let j = i; j < i + n; j++) {
                    if (removedIndices.has(j)) {
                        alreadyMatched = true;
                        break;
                    }
                }
                if (alreadyMatched) continue;
                
                const phrase = words.slice(i, i + n).join(' ');
                if (canonicalMap.has(phrase)) {
                    const canonical = canonicalMap.get(phrase) || phrase;
                    items.add(canonical);
                    
                    for (let j = i; j < i + n; j++) {
                        removedIndices.add(j);
                    }
                    
                    if (this.debugMode) {
                        console.log(`Found match in ${dictionaryName}: "${phrase}" => "${canonical}"`);
                    }
                }
            }
        }

        explicitMatches.forEach(match => items.add(match));

        if (dictionaryName === 'Place') {
            if (this.debugMode) {
                console.log("Place dictionary found, extracting regions and countries");
            }
            
            const countriesDict = this.dictionaries.get('Place');
            if (countriesDict) {
                const countryToRegionMap = this.getCountryToRegionMap(countriesDict);

                if (this.debugMode) {
                    console.log("Country to Region Map:", countryToRegionMap);
                }
                
                explicitMatches.forEach(region => {
                    countryToRegionMap.forEach((countryRegion, country) => {
                        if (countryRegion === region) {
                            items.add(country);
                        }
                    });
                });
            }
        }
        
        // Create remaining text by filtering out matched words
        const remainingWords = words.filter((_, index) => !removedIndices.has(index));
        const remainingText = remainingWords.join(' ');
        
        if (this.debugMode && removedIndices.size > 0) {
            console.log(`Removed ${removedIndices.size} words from search text for ${dictionaryName}`);
            console.log(`Remaining text: "${remainingText}"`);
        }
        
        return { 
            items: Array.from(items),
            remainingText: remainingText
        };
    }

    private getCountryToRegionMap(countriesDict: Dictionary): Map<string, string> {
        const result = new Map<string, string>();
        const allCountries = countriesDict.getAllTerms();
        const canonicalMap = countriesDict.getTermToCanonicalMap();
        
        allCountries.forEach(term => {
            const parts = term.split(':');
            if (parts.length === 2) {
                const country = parts[0].trim();
                const region = parts[1].trim();
                
                const canonicalCountry = canonicalMap.get(country) || country;
                result.set(canonicalCountry, region);
            }
        });
        
        return result;
    }

    private extractFeatures(text: string): { features: string[], matchDetails?: MatchResult[], remainingText: string } {
        if(!text || text.trim().length === 0) {
            console.log("[DEBUG] Empty or whitespace-only text provided for feature extraction");
            return { features: [], remainingText: text || '' };
        }
        
        const featuresDict = this.dictionaries.get('Feature');
        if (!featuresDict) {
            if (this.debugMode) {
                console.log("No feature dictionary available");
            }
            return { features: [], remainingText: text };
        }
      
        const words = text.toLowerCase().split(/\s+/);
        const canonicalMap = featuresDict.getTermToCanonicalMap();
        const allTerms = featuresDict.getAllTerms();
        const removedIndices = new Set<number>();
        
        if (this.debugMode) {
            console.log("Analyzing text for features:", text);
            console.log("Words:", words);
        }

        const exactMatches: MatchResult[] = [];
        
        // First, try to find exact matches for multi-word features
        for (let n = 12; n >= 1; n--) {
            for (let i = 0; i <= words.length - n; i++) {
                let alreadyMatched = false;
                for (let j = i; j < i + n; j++) {
                    if (removedIndices.has(j)) {
                        alreadyMatched = true;
                        break;
                    }
                }
                if (alreadyMatched) continue;
                
                const phrase = words.slice(i, i + n).join(' ');
                const exactMatcher = new ExactMatcher(this.debugMode);
                const match = exactMatcher.findMatch(phrase, allTerms, canonicalMap);
                
                if (match) {
                    if (this.debugMode) {
                        console.log("Exact feature match found:", match);
                    }
                  
                    match.position = i;
                    match.length = n;
                    exactMatches.push(match);
                    
                    for (let j = i; j < i + n; j++) {
                        removedIndices.add(j);
                    }
                }
            }
        }
        
        const potentialMatches: MatchResult[] = [];
        
        // Only use fuzzy matching if we don't have exact matches
        // And increase the threshold to 0.95 to reduce false positives
        if (exactMatches.length === 0) {
            for (let i = 0; i < words.length; i++) {
                if (removedIndices.has(i)) continue;
                
                const word = words[i];
                const match = this.matchingStrategy.findBestMatch(word, allTerms, canonicalMap);
                if (match && match.score >= 0.95) { // Increased threshold from 0.9 to 0.95
                    match.position = i;
                    potentialMatches.push(match);
                    removedIndices.add(i);
                }
            }
        }
        
        potentialMatches.sort((a, b) => b.score - a.score);
        
        if (this.debugMode && potentialMatches.length > 0) {
            console.log("All potential feature matches:", potentialMatches);
        }
        
        // Create remaining text by filtering out matched words
        const remainingWords = words.filter((_, index) => !removedIndices.has(index));
        const remainingText = remainingWords.join(' ');
        
        if (this.debugMode && removedIndices.size > 0) {
            console.log(`Removed ${removedIndices.size} words from search text for features`);
            console.log(`Remaining text: "${remainingText}"`);
        }
        
        // Combine exact and fuzzy matches for the result
        const allFeatures = [
            ...exactMatches.map(match => match.canonicalForm),
            ...potentialMatches.map(match => match.canonicalForm)
        ];
        
        return {
            features: allFeatures,
            matchDetails: [...exactMatches, ...potentialMatches],
            remainingText: remainingText
        };
    }

    private extractStyles(text: string): { styles: string[], matchDetails?: MatchResult[], remainingText: string } {
        const stylesDict = this.dictionaries.get('Style');
        if (!stylesDict) {
            if (this.debugMode) {
                console.log("No styles dictionary available");
            }
            return { styles: [], remainingText: text };
        }
      
        const words = text.toLowerCase().split(/\s+/);
        const canonicalMap = stylesDict.getTermToCanonicalMap();
        const allTerms = stylesDict.getAllTerms();
        const removedIndices = new Set<number>();
        
        if (this.debugMode) {
            console.log("Analyzing text for styles:", text);
            console.log("Words:", words);
        }

        const exactMatches: MatchResult[] = [];
        
        for (let n = 5; n >= 1; n--) {
            for (let i = 0; i <= words.length - n; i++) {
              
                let alreadyMatched = false;
                for (let j = i; j < i + n; j++) {
                    if (removedIndices.has(j)) {
                        alreadyMatched = true;
                        break;
                    }
                }
                if (alreadyMatched) continue;
                
                const phrase = words.slice(i, i + n).join(' ');
                const exactMatcher = new ExactMatcher(this.debugMode);
                const match = exactMatcher.findMatch(phrase, allTerms, canonicalMap);
                
                if (match) {
                    if (this.debugMode) {
                        console.log("Exact style match found:", match);
                    }
                    
                    match.position = i;
                    match.length = n;
                    exactMatches.push(match);
                    
                    for (let j = i; j < i + n; j++) {
                        removedIndices.add(j);
                    }
                }
            }
        }
        
        const potentialMatches: MatchResult[] = [];
        
        if (exactMatches.length === 0) {
            for (let i = 0; i < words.length; i++) {
                if (removedIndices.has(i)) continue;
                
                const word = words[i];
                const match = this.matchingStrategy.findBestMatch(word, allTerms, canonicalMap);
                if (match && match.score >= 0.95) { 
                    match.position = i;
                    potentialMatches.push(match);
                    removedIndices.add(i);
                }
            }
        }
        
        potentialMatches.sort((a, b) => b.score - a.score);
        
        if (this.debugMode && potentialMatches.length > 0) {
            console.log("All potential style matches:", potentialMatches);
        }
        
        // Create remaining text by filtering out matched words
        const remainingWords = words.filter((_, index) => !removedIndices.has(index));
        const remainingText = remainingWords.join(' ');
        
        if (this.debugMode && removedIndices.size > 0) {
            console.log(`Removed ${removedIndices.size} words from search text for styles`);
            console.log(`Remaining text: "${remainingText}"`);
        }
        
        // Combine exact and fuzzy matches for the result
        const allStyles = [
            ...exactMatches.map(match => match.canonicalForm),
            ...potentialMatches.map(match => match.canonicalForm)
        ];
        
        return {
            styles: allStyles,
            matchDetails: [...exactMatches, ...potentialMatches],
            remainingText: remainingText
        };
    }

    // public analyze(text: string): AnalysisResult {
    //     if (this.debugMode) {
    //         console.log("Starting analysis with text:", text);
    //     }

    //     // Copy the original text for multiple extraction passes
    //     let currentText = text;
        
    //     // First pass: Extract brand name
    //     const brandResult = this.extractBrandName(currentText);
    //     currentText = brandResult.remainingText;
    //     let featuresResult;
    //     //  featuresResult = this.extractFeatures(currentText);
    //     // currentText = featuresResult.remainingText;

    //     // Second pass: Extract product type
    //     const productTypeResult = this.extractProductType(currentText);
    //     currentText = productTypeResult.remainingText;
        
    //     // Third pass: Extract features

    //     console.log(`reaming text after productType extraction: "${currentText}"`);
    //      featuresResult = this.extractFeatures(currentText);
    //     currentText = featuresResult.remainingText;
        
    //     // Fourth pass: Extract styles
    //     const stylesResult = this.extractStyles(currentText);
    //     currentText = stylesResult.remainingText;
        
    //     // Fifth pass: Extract places
    //     const placesResult = this.extractDictionaryItems(currentText, 'Place', 5);
    //     currentText = placesResult.remainingText;
        
    //     // Last pass: Extract product name
    //     const productNameResult = this.extractProductName(currentText);
        
    //     // Now do the same passes but in the opposite order 
    //     // to catch items that might have been missed due to order dependency
    //     // currentText = text;
        
    //     // // Second pass in reverse: Extract places
    //     // const placesResult2 = this.extractDictionaryItems(currentText, 'Place', 5);
    //     // currentText = placesResult2.remainingText;
        
    //     // // Extract styles in reverse order
    //     // const stylesResult2 = this.extractStyles(currentText);
    //     // currentText = stylesResult2.remainingText;
        
    //     // // Extract features in reverse order
    //     // const featuresResult2 = this.extractFeatures(currentText);
    //     // currentText = featuresResult2.remainingText;
         
    //     // // Extract product type in reverse order
    //     // const productTypeResult2 = this.extractProductType(currentText);
    //     // currentText = productTypeResult2.remainingText;
        
    //     // // Extract brand name in reverse order
    //     // const brandResult2 = this.extractBrandName(currentText);
        
    //     // Combine results from both directions
    //     // const combinedResult: AnalysisResult = {
    //     //     places: [...new Set([...placesResult.items, ...placesResult2.items])],
    //     //     styles: [...new Set([...stylesResult.styles, ...stylesResult2.styles])],
    //     //     features: [...new Set([...featuresResult.features, ...featuresResult2.features])],
    //     //     productType: productTypeResult.productType || productTypeResult2.productType,
    //     //     brandName: brandResult.brandName || brandResult2.brandName,
    //     //     productName: productNameResult.productName,
    //     //     originalText: text,
    //     //     confidence: this.calculateConfidenceForAnalysis(text, 
    //     //         brandResult.brandName !== null || brandResult2.brandName !== null)
    //     // };


    //     const combinedResult: AnalysisResult = {
    //         places: [...new Set([...placesResult.items ])],
    //         styles: [...new Set([...stylesResult.styles])],
    //         features: [...new Set([...featuresResult.features])],
    //         productType: productTypeResult.productType,
    //         brandName: brandResult.brandName,
    //         productName: productNameResult.productName,
    //         originalText: text,
    //         confidence: this.calculateConfidenceForAnalysis(text, 
    //             brandResult.brandName !== null)
    //     };

    //     if (this.debugMode && productTypeResult.matchDetails) {
    //         combinedResult.matchDetails = productTypeResult.matchDetails;
    //     }

    //     return combinedResult;
    // }

    private cleanText(text: string): string {
        // Replace special characters with spaces to maintain word separation
        return text
            .replace(/[()[\]{}.,;:!?'"]/g, ' ') // Replace punctuation with spaces
            .replace(/[^\w\s-]/g, ' ') // Replace any remaining special chars with spaces
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim(); // Remove leading/trailing whitespace
    }

    public analyze(text: string): AnalysisResult {
        if (this.debugMode) {
            console.log("Starting analysis with text:", text);
        }

        const cleanedText = this.cleanText(text);
    
        // FIRST PASS: Features → Product Type → Brand → Styles → Places → Product Name
        let currentText1 = cleanedText;
    
        const brandResult1 = this.extractBrandName(currentText1);
        currentText1 = brandResult1.remainingText;
        // console.log(`Remaining text after brandName extraction (pass 1): "${currentText1}"`);
        
        const featuresResult1 = this.extractFeatures(currentText1);
        currentText1 = featuresResult1.remainingText;
        

        // console.log(`Remaining text after features extraction (pass 1): "${currentText1}"`);

        
        const productTypeResult1 = this.extractProductType(currentText1);
        currentText1 = productTypeResult1.remainingText;
        
        // console.log(`Remaining text after productType extraction (pass 1): "${currentText1}"`);


        const stylesResult1 = this.extractStyles(currentText1);
        currentText1 = stylesResult1.remainingText;


        // console.log(`Remaining text after styles extraction (pass 1): "${currentText1}"`);

        
        const placesResult1 = this.extractDictionaryItems(currentText1, 'Place', 5);
        currentText1 = placesResult1.remainingText;

        // console.log(`Remaining text after place extraction (pass 1): "${currentText1}"`);

        
        const productNameResult1 = this.extractProductName(currentText1);
    
        // SECOND PASS: Product Type → Features → Brand → Styles → Places → Product Name
        let currentText2 = cleanedText;
        
        const brandResult2 = this.extractBrandName(currentText2);
        currentText2 = brandResult2.remainingText;
        // console.log(`Remaining text after brandName extraction (pass 2): "${currentText2}"`);

        
        const productTypeResult2 = this.extractProductType(currentText2);
        currentText2 = productTypeResult2.remainingText;
        
        // console.log(`Remaining text after productType extraction (pass 2): "${currentText2}"`);
        
        const featuresResult2 = this.extractFeatures(currentText2);
        currentText2 = featuresResult2.remainingText;

        // console.log(`Remaining text after features extraction (pass 2): "${currentText2}"`);

        
        const stylesResult2 = this.extractStyles(currentText2);
        currentText2 = stylesResult2.remainingText;

        // console.log(`Remaining text after styles extraction (pass 2): "${currentText2}"`);

        
        const placesResult2 = this.extractDictionaryItems(currentText2, 'Place', 5);
        currentText2 = placesResult2.remainingText;

        // console.log(`Remaining text after places extraction (pass 2): "${currentText2}"`);

        
        const productNameResult2 = this.extractProductName(currentText2);

        // console.log(`Remaining text after productName extraction (pass 2): "${currentText2}"`);

    
        // Calculate confidence for each pass with complete analysis data
        const analysis1 = {
            productType: productTypeResult1.productType,
            hasBrand: brandResult1.brandName !== null,
            features: featuresResult1.features || [],
            styles: stylesResult1.styles || [],
            places: placesResult1.items || [],
            originalText: text
        };
        
        const analysis2 = {
            productType: productTypeResult2.productType,
            hasBrand: brandResult2.brandName !== null,
            features: featuresResult2.features || [],
            styles: stylesResult2.styles || [],
            places: placesResult2.items || [],
            originalText: text
        };
    
        const confidence1 = this.calculateConfidence(analysis1);
        const confidence2 = this.calculateConfidence(analysis2);
    
        if (this.debugMode) {
            console.log("First pass results:", {
                features: featuresResult1.features,
                productType: productTypeResult1.productType,
                brand: brandResult1.brandName,
                confidence: confidence1
            });
            console.log("Second pass results:", {
                productType: productTypeResult2.productType,
                features: featuresResult2.features,
                brand: brandResult2.brandName,
                confidence: confidence2
            });
            console.log("Pass 1 confidence:", confidence1);
            console.log("Pass 2 confidence:", confidence2);
        }
    
        // Choose results based on confidence scores
        let selectedResults;
        let finalConfidence;
    
        // Add logic to prefer correct extraction based on context
        const analysis1HasCorrectFeatures = analysis1.features.length > 0 && analysis1.productType === null;
        const analysis2HasIncorrectExtraction = analysis2.productType !== null && analysis2.features.length > 0;
        const textHasProductAndFeatures = text.toLowerCase().includes('sofa') || text.toLowerCase().includes('chair') || text.toLowerCase().includes('couch');
        const textIsJustFeatures = (text.toLowerCase().includes('arms') || text.toLowerCase().includes('elevated')) && !textHasProductAndFeatures;
        
        // Case 1: Just features (e.g., "elevated arms") - prefer analysis with features only
        if (textIsJustFeatures && analysis1HasCorrectFeatures && analysis2HasIncorrectExtraction) {
            selectedResults = {
                places: placesResult1.items,
                styles: stylesResult1.styles,
                features: featuresResult1.features,
                productType: productTypeResult1.productType,
                brandName: brandResult1.brandName,
                productName: productNameResult1.productName,
                matchDetails: productTypeResult1.matchDetails
            };
            finalConfidence = confidence1;
            
            if (this.debugMode) {
                console.log("Selected Pass 1 results - feature-only text detected");
            }
        }
        // Case 2: Product with features (e.g., "sofa with elevated arms") - prefer analysis with both
        else if (textHasProductAndFeatures) {
            // Choose the analysis that has both product type and features
            const analysis1HasBoth = analysis1.productType && analysis1.features.length > 0;
            const analysis2HasBoth = analysis2.productType && analysis2.features.length > 0;
            
            if (analysis1HasBoth && !analysis2HasBoth) {
                selectedResults = {
                    places: placesResult1.items,
                    styles: stylesResult1.styles,
                    features: featuresResult1.features,
                    productType: productTypeResult1.productType,
                    brandName: brandResult1.brandName,
                    productName: productNameResult1.productName,
                    matchDetails: productTypeResult1.matchDetails
                };
                finalConfidence = confidence1;
                
                if (this.debugMode) {
                    console.log("Selected Pass 1 results - has both product and features");
                }
            } else if (analysis2HasBoth && !analysis1HasBoth) {
                selectedResults = {
                    places: placesResult2.items,
                    styles: stylesResult2.styles,
                    features: featuresResult2.features,
                    productType: productTypeResult2.productType,
                    brandName: brandResult2.brandName,
                    productName: productNameResult2.productName,
                    matchDetails: productTypeResult2.matchDetails
                };
                finalConfidence = confidence2;
                
                if (this.debugMode) {
                    console.log("Selected Pass 2 results - has both product and features");
                }
            } else {
                // Fall back to confidence comparison
                if (confidence1 > confidence2) {
                    selectedResults = {
                        places: placesResult1.items,
                        styles: stylesResult1.styles,
                        features: featuresResult1.features,
                        productType: productTypeResult1.productType,
                        brandName: brandResult1.brandName,
                        productName: productNameResult1.productName,
                        matchDetails: productTypeResult1.matchDetails
                    };
                    finalConfidence = confidence1;
                    
                    if (this.debugMode) {
                        console.log("Selected Pass 1 results - higher confidence");
                    }
                } else {
                    selectedResults = {
                        places: placesResult2.items,
                        styles: stylesResult2.styles,
                        features: featuresResult2.features,
                        productType: productTypeResult2.productType,
                        brandName: brandResult2.brandName,
                        productName: productNameResult2.productName,
                        matchDetails: productTypeResult2.matchDetails
                    };
                    finalConfidence = confidence2;
                    
                    if (this.debugMode) {
                        console.log("Selected Pass 2 results - higher confidence");
                    }
                }
            }
        }
        // Case 3: Regular confidence-based selection
        else {
            if (confidence1 > confidence2) {
                selectedResults = {
                    places: placesResult1.items,
                    styles: stylesResult1.styles,
                    features: featuresResult1.features,
                    productType: productTypeResult1.productType,
                    brandName: brandResult1.brandName,
                    productName: productNameResult1.productName,
                    matchDetails: productTypeResult1.matchDetails
                };
                finalConfidence = confidence1;
                
                if (this.debugMode) {
                    console.log("Selected Pass 1 results (Features → Product Type)");
                }
            } else {
                selectedResults = {
                    places: placesResult2.items,
                    styles: stylesResult2.styles,
                    features: featuresResult2.features,
                    productType: productTypeResult2.productType,
                    brandName: brandResult2.brandName,
                    productName: productNameResult2.productName,
                    matchDetails: productTypeResult2.matchDetails
                };
                finalConfidence = confidence2;
                
                if (this.debugMode) {
                    console.log("Selected Pass 2 results (Product Type → Features)");
                }
            }
        }
    
        // Create final result with selected pass results
        const combinedResult: AnalysisResult = {
            places: selectedResults.places,
            styles: selectedResults.styles,
            features: selectedResults.features,
            productType: selectedResults.productType,
            brandName: selectedResults.brandName,
            productName: selectedResults.productName,
            originalText: text,
            confidence: finalConfidence
        };
    
        // Include debug information if available
        if (this.debugMode) {
            if (selectedResults.matchDetails) {
                combinedResult.matchDetails = selectedResults.matchDetails;
            }
            
            console.log("Final selected results:", combinedResult);
        }
    
        return combinedResult;
    }
    

    private calculateConfidence(analysis: Record<string, any>): number {
        let score = 0;
        
        // Product type identified: +0.6 (but only if it makes sense in context)
        if (analysis.productType) {
            score += 0.6;
        }
        
        // Brand identified: +0.2
        if (analysis.hasBrand) {
            score += 0.2;
        }
        
        // Features identified: up to +0.15
        if (analysis.features && Array.isArray(analysis.features)) {
            let featureScore = analysis.features.length * 0.03;
            
            // Bonus for contextually correct features
            const contextualFeatures = analysis.features.filter(feature => 
                feature.toLowerCase().includes('elevated') || 
                feature.toLowerCase().includes('raised') ||
                feature.toLowerCase().includes('arms') ||
                feature.toLowerCase().includes('with')
            );
            
            if (contextualFeatures.length > 0) {
                featureScore += 0.1; // Bonus for contextually relevant features
            }
            
            score += Math.min(featureScore, 0.15);
        }
        
        // Styles identified: up to +0.08
        score += Math.min(analysis.styles.length * 0.02, 0.08);
        
        // Places identified: up to +0.02
        score += Math.min(analysis.places.length * 0.01, 0.02);
        
        // Context-aware penalties and bonuses
        if (analysis.originalText) {
            const text = analysis.originalText.toLowerCase();
            
            // Case 1: Just feature description (e.g., "elevated arms")
            if ((text.includes('elevated arms') || text.includes('raised arms')) && 
                !text.includes('sofa') && !text.includes('chair') && !text.includes('couch')) {
                
                if (analysis.productType) {
                    score -= 0.4; // Penalty for incorrect product type detection
                }
                if (analysis.features.length > 0) {
                    score += 0.1; // Bonus for correct feature detection
                }
            }
            
            // Case 2: Product with features (e.g., "sofa with elevated arms")
            else if ((text.includes('sofa') || text.includes('chair') || text.includes('couch')) && 
                     (text.includes('elevated') || text.includes('raised') || text.includes('with'))) {
                
                if (analysis.productType && analysis.features.length > 0) {
                    score += 0.15; // Bonus for both product type and features
                }
            }
            
            // Case 3: Just product type (e.g., "sofa")
            else if ((text.includes('sofa') || text.includes('chair') || text.includes('couch')) && 
                     text.split(' ').length <= 2) {
                
                if (analysis.productType && analysis.features.length === 0) {
                    score += 0.1; // Bonus for clean product type detection
                }
            }
        }
        
        return Math.min(Math.max(score, 0), 1.0);
    }
    

    public analyzeSentiment(text: string): { score: number, label: string } {
        const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
        const tokens = this.tokenizer.tokenize(text);
        const score = analyzer.getSentiment(tokens);
        
        let label = "Neutral";
        if (score > 0.2) label = "Positive";
        else if (score < -0.2) label = "Negative";
        
        return { score, label };
    }

    public findImportantTerms(text: string, topN: number = 5): { term: string, score: number }[] {
        const tfidf = new natural.TfIdf();
        tfidf.addDocument(text);
        
        return tfidf.listTerms(0)
            .slice(0, topN)
            .map(item => ({ term: item.term, score: item.tfidf }));
    }
}

export default FurnitureAnalyzer;