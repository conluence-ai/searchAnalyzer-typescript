import * as natural from "natural"
import { AnalysisResult, Dictionary, MatchResult } from "../interface/searchInterface";
import TextMatcher from "./textMatcher";
import MatchingStrategy from "./matchingStrategy";
import JaroWrinklerMatcher from "./algorithms/jaroWrinklerTextMatcher";
import ExactMatcher from "./algorithms/exactMatcher";
import SoundExMatcher from "./algorithms/soundExMatcher";
import LevenshteinMatcher from "./algorithms/LevenshteinMatcher";
import { DictonaryTrie } from "./algorithms/trieMatcher";

class FurnitureAnalyzer {
    private tokenizer: natural.WordTokenizer;
    private debugMode: boolean;
    private dictionaries: Map<string, Dictionary>;
    private matchingStrategy: MatchingStrategy;
    private exactMatcher: ExactMatcher;

   private productTypeTrie : DictonaryTrie | null = null;
   private brandTrie: DictonaryTrie | null = null;
   private productNameTrie: DictonaryTrie | null = null;
   private featureTrie: DictonaryTrie | null = null;
   private styleTrie: DictonaryTrie | null = null;
   private placeTrie: DictonaryTrie | null = null;

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
        this.exactMatcher = new ExactMatcher(this.debugMode);


        this.productTypeTrie = new DictonaryTrie(null, this.debugMode);
        this.brandTrie = new DictonaryTrie(null, this.debugMode);
        this.productNameTrie = new DictonaryTrie(null, this.debugMode);
        this.featureTrie = new DictonaryTrie(null, this.debugMode);
        this.styleTrie = new DictonaryTrie(null, this.debugMode);
        this.placeTrie = new DictonaryTrie(null, this.debugMode);


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
        switch (key) {
            case 'ProductType':
                if (this.productTypeTrie) {
                    this.productTypeTrie.updateDictionary(dictionary);
                }
                break;
            case 'Brand':
                if (this.brandTrie) {
                    this.brandTrie.updateDictionary(dictionary);
                }
                break;
            case 'ProductName':
                if (this.productNameTrie) {
                    this.productNameTrie.updateDictionary(dictionary);
                }
                break;
            case 'Feature':
                if (this.featureTrie) {
                    this.featureTrie.updateDictionary(dictionary);
                }
                break;
            case 'Style':
                if (this.styleTrie) {
                    this.styleTrie.updateDictionary(dictionary);
                }
                break;
            case 'Place':
                if (this.placeTrie) {
                    this.placeTrie.updateDictionary(dictionary);
                }
                break;
        }
        

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

        // Look for multi-word product types first (exact matches only for phrases)
        // for (let n = 4; n >= 1; n--) {
        //     for (let i = 0; i <= words.length - n; i++) {
        //         const phrase = words.slice(i, i + n).join(' ');
        //         const match = this.exactMatcher.findMatch(phrase, allTerms, canonicalMap);

        //         if (match) {
        //             const matchedWords = phrase.split(/\s+/);
        //             const remainingWords = [...words];
        //             const startIdx = i;
        //             remainingWords.splice(startIdx, matchedWords.length);
        //             const remainingText = remainingWords.join(' ');

        //             if (this.debugMode) {
        //                 console.log(`Found exact product type: "${match.canonicalForm}"`);
        //                 console.log(`Removed "${phrase}" from search text`);
        //                 console.log(`Remaining text: "${remainingText}"`);
        //             }
                    
        //             return {
        //                 productType: match.canonicalForm,
        //                 matchDetails: match,
        //                 remainingText: remainingText
        //             };
        //         }
        //     }
        // }


         // Use Trie for optimized multi-word matching
         for (let i = 0; i < words.length; i++) {
            const trieMatch = this.productTypeTrie?.findLongestMatch(words, i);
            
            if (trieMatch) {
                const matchLength = trieMatch.length || 1;
                const remainingWords = [...words];
                remainingWords.splice(i, matchLength);
                const remainingText = remainingWords.join(' ');

                if (this.debugMode) {
                    console.log(`Found Trie product type: "${trieMatch.canonicalForm}"`);
                    console.log(`Removed "${trieMatch.word}" from search text`);
                    console.log(`Remaining text: "${remainingText}"`);
                }
                
                return {
                    productType: trieMatch.canonicalForm,
                    matchDetails: trieMatch,
                    remainingText: remainingText
                };
            }
        }

        // Try single-word matches with enhanced matching strategy
        const potentialMatches: MatchResult[] = [];

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            // Get top matches instead of just best match for better analysis
            const topMatches = this.matchingStrategy.findTopMatches(word, allTerms, canonicalMap, 3);
            
            topMatches.forEach(match => {
                if (match) {
                    match.position = i;
                    potentialMatches.push(match);
                }
            });
        }

        // Enhanced sorting considers algorithm priority automatically
        potentialMatches.sort((a, b) => {
            // Exact matches first
            if (a.algorithm === 'Exact' && b.algorithm !== 'Exact') return -1;
            if (b.algorithm === 'Exact' && a.algorithm !== 'Exact') return 1;
            
            // Then by score
            return b.score - a.score;
        });

        if (this.debugMode && potentialMatches.length > 0) {
            console.log("All potential product type matches:", potentialMatches.map(m => 
                `${m.word} -> ${m.canonicalForm} (${m.algorithm}: ${m.score.toFixed(3)})`
            ));
        }

        if (potentialMatches.length > 0) {
            const bestMatch = potentialMatches[0];

            if (this.debugMode) {
                console.log(`[Best Product Type Match] "${bestMatch.word}" => "${bestMatch.canonicalForm}" (${bestMatch.algorithm}, score: ${bestMatch.score.toFixed(3)})`);
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
                    productType: bestMatch.canonicalForm,
                    matchDetails: bestMatch,
                    remainingText: remainingText
                };
            }
        }

        return { productType: null, remainingText: text };
    }

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
    }
    
    // Check for multi-word brand names first (exact matches only)
    // for (let n = 5; n >= 1; n--) {
    //     for (let i = 0; i <= words.length - n; i++) {
    //         const phrase = words.slice(i, i + n).join(' ');
            
    //         // Skip if phrase contains furniture terms
    //         if (phrase.split(' ').some(word => furnitureTerms.has(word))) {
    //             continue;
    //         }
            
    //         const match = this.exactMatcher.findMatch(phrase, allTerms, canonicalMap);
            
    //         if (match) {
    //             if (this.debugMode) {
    //                 console.log("Exact brand match found:", match);
    //             }
                
    //             // Create remaining text
    //             const remainingWords = [...words];
    //             remainingWords.splice(i, n);
    //             const remainingText = remainingWords.join(' ');
                
    //             if (this.debugMode) {
    //                 console.log(`Removed "${phrase}" from search text`);
    //                 console.log(`Remaining text: "${remainingText}"`);
    //             }
                
    //             return { 
    //                 brandName: match.canonicalForm,
    //                 matchDetails: match,
    //                 remainingText: remainingText
    //             };
    //         }
    //     }
    // }

    // Use Trie for optimized multi-word matching

    for (let i = 0; i < words.length; i++) {
        if (furnitureTerms.has(words[i])) {
            continue;
        }

        const trieMatch = this.brandTrie?.findLongestMatch(words, i);
        if (trieMatch) {    
            const matchWords = trieMatch.word.split(' ');
            if (matchWords.some(word => furnitureTerms.has(word))) {
                continue;
            }

            const matchLength = trieMatch.length || 1;
            const remainingWords = [...words];
            remainingWords.splice(i, matchLength);
            const remainingText = remainingWords.join(' ');

            if (this.debugMode) {
                console.log(`Found Trie brand: "${trieMatch.canonicalForm}"`);
                console.log(`Removed "${trieMatch.word}" from search text`);
                console.log(`Remaining text: "${remainingText}"`);
            }
            
            return {
                brandName: trieMatch.canonicalForm,
                matchDetails: trieMatch,
                remainingText: remainingText
            };
        }
    }
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        if (/^\d+$/.test(word) && allTerms.includes(word)) {
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
        
        // Use enhanced matching strategy
        const match = this.matchingStrategy.findBestMatch(word, allTerms, canonicalMap);
        if (match) {
            match.position = i;
            potentialMatches.push(match);
        }
    }
    
    // Enhanced sorting is handled by MatchingStrategy
    potentialMatches.sort((a, b) => {
        if (a.algorithm === 'Exact' && b.algorithm !== 'Exact') return -1;
        if (b.algorithm === 'Exact' && a.algorithm !== 'Exact') return 1;
        return b.score - a.score;
    });
    
    if (this.debugMode && potentialMatches.length > 0) {
        console.log("All potential brand matches:", potentialMatches.map(m => 
            `${m.word} -> ${m.canonicalForm} (${m.algorithm}: ${m.score.toFixed(3)})`
        ));
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
        // const productDict = this.dictionaries.get('ProductName');
        // if (!productDict) {
        //     if (this.debugMode) {
        //         console.log("No product name dictionary available");
        //     }
        //     return { productName: null, remainingText: text };
        // }
      
        // const words = text.toLowerCase().split(/\s+/);
        // const canonicalMap = productDict.getTermToCanonicalMap();
        // const allTerms = productDict.getAllTerms();
        // const removedIndices = new Set<number>();
        
        // if (this.debugMode) {
        //     console.log("Analyzing text for product name:", text);
        //     console.log("Words:", words);
        // }
        
        // for (let n = 4; n >= 1; n--) {
        //     for (let i = 0; i <= words.length - n; i++) {
        //         let alreadyMatched = false;
        //         for (let j = i; j < i + n; j++) {
        //             if (removedIndices.has(j)) {
        //                 alreadyMatched = true;
        //                 break;
        //             }
        //         }
        //         if (alreadyMatched) continue;
                
        //         const phrase = words.slice(i, i + n).join(' ');
        //         const match = this.exactMatcher.findMatch(phrase, allTerms, canonicalMap);
                
        //         if (match) {
        //             if (this.debugMode) {
        //                 console.log(`Found exact product name match: "${match.canonicalForm}"`);
        //             }
                    
        //             // Mark these words as matched
        //             for (let j = i; j < i + n; j++) {
        //                 removedIndices.add(j);
        //             }
                    
        //             // Create remaining text
        //             const remainingWords = words.filter((_, index) => !removedIndices.has(index));
        //             const remainingText = remainingWords.join(' ');
                    
        //             return { 
        //                 productName: match.canonicalForm,
        //                 matchDetails: match,
        //                 remainingText: remainingText
        //             };
        //         }
        //     }
        // }
        
        // return { productName: null, remainingText: text };



        const productDict = this.dictionaries.get('ProductName');
        if (!productDict) {
            if (this.debugMode) {
                console.log("No product name dictionary available");
            }
            return { productName: null, remainingText: text };
        }
      
        const words = text.toLowerCase().split(/\s+/);
        const removedIndices = new Set<number>();
        
        if (this.debugMode) {
            console.log("Analyzing text for product name:", text);
            console.log("Words:", words);
        }
        
        // Use Trie for optimized product name matching
        for (let i = 0; i < words.length; i++) {
            if (removedIndices.has(i)) continue;

            const trieMatch = this.productNameTrie?.findLongestMatch(words, i);
            
            if (trieMatch) {
                const matchLength = trieMatch.length || 1;
                
                // Mark these words as matched
                for (let j = i; j < i + matchLength; j++) {
                    removedIndices.add(j);
                }
                
                const remainingWords = words.filter((_, index) => !removedIndices.has(index));
                const remainingText = remainingWords.join(' ');

                if (this.debugMode) {
                    console.log(`Found Trie product name: "${trieMatch.canonicalForm}"`);
                }
                
                return { 
                    productName: trieMatch.canonicalForm,
                    matchDetails: trieMatch,
                    remainingText: remainingText
                };
            }
        }
        
        return { productName: null, remainingText: text };
    }


    private extractDictionaryItems(text: string, dictionaryName: string,trie: DictonaryTrie, maxPhraseWords: number = 3): 
        { items: string[], remainingText: string, matchDetails?: MatchResult[] } {
        // const dict = this.dictionaries.get(dictionaryName);
        // if (!dict) return { items: [], remainingText: text };
        
        // if (this.debugMode) {
        //     console.log("Extracting items from dictionary:", dictionaryName);
        //     console.log("Text:", text);
        // }
        
        // const words = text.toLowerCase().split(/\s+/);
        // const canonicalMap = dict.getTermToCanonicalMap();
        // const items = new Set<string>();
        // const explicitMatches = new Set<string>();
        // const removedIndices = new Set<number>();
        
        // for (let n = maxPhraseWords; n >= 1; n--) {
        //     for (let i = 0; i <= words.length - n; i++) {
        
        //         let alreadyMatched = false;
        //         for (let j = i; j < i + n; j++) {
        //             if (removedIndices.has(j)) {
        //                 alreadyMatched = true;
        //                 break;
        //             }
        //         }
        //         if (alreadyMatched) continue;
                
        //         const phrase = words.slice(i, i + n).join(' ');
        //         if (canonicalMap.has(phrase)) {
        //             const canonical = canonicalMap.get(phrase) || phrase;
        //             items.add(canonical);
                    
        //             for (let j = i; j < i + n; j++) {
        //                 removedIndices.add(j);
        //             }
                    
        //             if (this.debugMode) {
        //                 console.log(`Found match in ${dictionaryName}: "${phrase}" => "${canonical}"`);
        //             }
        //         }
        //     }
        // }

        // explicitMatches.forEach(match => items.add(match));

        // if (dictionaryName === 'Place') {
        //     if (this.debugMode) {
        //         console.log("Place dictionary found, extracting regions and countries");
        //     }
            
        //     const countriesDict = this.dictionaries.get('Place');
        //     if (countriesDict) {
        //         const countryToRegionMap = this.getCountryToRegionMap(countriesDict);

        //         if (this.debugMode) {
        //             console.log("Country to Region Map:", countryToRegionMap);
        //         }
                
        //         explicitMatches.forEach(region => {
        //             countryToRegionMap.forEach((countryRegion, country) => {
        //                 if (countryRegion === region) {
        //                     items.add(country);
        //                 }
        //             });
        //         });
        //     }
        // }
        
        // // Create remaining text by filtering out matched words
        // const remainingWords = words.filter((_, index) => !removedIndices.has(index));
        // const remainingText = remainingWords.join(' ');
        
        // if (this.debugMode && removedIndices.size > 0) {
        //     console.log(`Removed ${removedIndices.size} words from search text for ${dictionaryName}`);
        //     console.log(`Remaining text: "${remainingText}"`);
        // }
        
        // return { 
        //     items: Array.from(items),
        //     remainingText: remainingText
        // };


        if (this.debugMode) {
            console.log(`Extracting items using Trie from dictionary: ${dictionaryName}`);
            console.log("Text:", text);
        }
        
        const words = text.toLowerCase().split(/\s+/);
        const items = new Set<string>();
        const removedIndices = new Set<number>();
        const matchDetails: MatchResult[] = [];
        
        // Use Trie for optimized matching
        for (let i = 0; i < words.length; i++) {
            if (removedIndices.has(i)) continue;

            const trieMatch = trie.findLongestMatch(words, i);
            
            if (trieMatch) {
                const matchLength = trieMatch.length || 1;
                items.add(trieMatch.canonicalForm);
                matchDetails.push(trieMatch);
                
                // Mark these words as matched
                for (let j = i; j < i + matchLength; j++) {
                    removedIndices.add(j);
                }
                
                if (this.debugMode) {
                    console.log(`Found Trie match in ${dictionaryName}: "${trieMatch.word}" => "${trieMatch.canonicalForm}"`);
                }
            }
        }

        // Handle special case for Place dictionary (regions and countries)
        if (dictionaryName === 'Place') {
            const countriesDict = this.dictionaries.get('Place');
            if (countriesDict) {
                const countryToRegionMap = this.getCountryToRegionMap(countriesDict);
                
                items.forEach(region => {
                    countryToRegionMap.forEach((countryRegion, country) => {
                        if (countryRegion === region) {
                            items.add(country);
                        }
                    });
                });
            }
        }
        
        const remainingWords = words.filter((_, index) => !removedIndices.has(index));
        const remainingText = remainingWords.join(' ');
        
        if (this.debugMode && removedIndices.size > 0) {
            console.log(`Removed ${removedIndices.size} words from search text for ${dictionaryName}`);
            console.log(`Remaining text: "${remainingText}"`);
        }
        
        return { 
            items: Array.from(items),
            remainingText: remainingText,
            matchDetails: matchDetails
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
        // for (let n = 12; n >= 1; n--) {
        //     for (let i = 0; i <= words.length - n; i++) {
        //         let alreadyMatched = false;
        //         for (let j = i; j < i + n; j++) {
        //             if (removedIndices.has(j)) {
        //                 alreadyMatched = true;
        //                 break;
        //             }
        //         }
        //         if (alreadyMatched) continue;
                
        //         const phrase = words.slice(i, i + n).join(' ');
        //         // const exactMatcher = new ExactMatcher(this.debugMode);
        //         const match = this.exactMatcher.findMatch(phrase, allTerms, canonicalMap);
                
        //         if (match) {
        //             if (this.debugMode) {
        //                 console.log("Exact feature match found:", match);
        //             }
                  
        //             match.position = i;
        //             match.length = n;
        //             exactMatches.push(match);
                    
        //             for (let j = i; j < i + n; j++) {
        //                 removedIndices.add(j);
        //             }
        //         }
        //     }
        // }

        for (let i = 0; i < words.length; i++) {
            if (removedIndices.has(i)) continue;

            const trieMatch = this.featureTrie?.findLongestMatch(words, i);
            
            if (trieMatch) {
                const matchLength = trieMatch.length || 1;
                trieMatch.position = i;
                trieMatch.length = matchLength;
                exactMatches.push(trieMatch);
                
                // Mark these words as matched
                for (let j = i; j < i + matchLength; j++) {
                    removedIndices.add(j);
                }

                if (this.debugMode) {
                    console.log(`Found Trie feature: "${trieMatch.word}" => "${trieMatch.canonicalForm}"`);
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

        for (let i = 0; i < words.length; i++) {
            if (removedIndices.has(i)) continue;

            const trieMatch = this.styleTrie?.findLongestMatch(words, i);
            
            if (trieMatch) {
                const matchLength = trieMatch.length || 1;
                trieMatch.position = i;
                trieMatch.length = matchLength;
                exactMatches.push(trieMatch);
                
                // Mark these words as matched
                for (let j = i; j < i + matchLength; j++) {
                    removedIndices.add(j);
                }

                if (this.debugMode) {
                    console.log(`Found Trie style: "${trieMatch.word}" => "${trieMatch.canonicalForm}"`);
                }
            }
        }
        
        
        // for (let n = 5; n >= 1; n--) {
        //     for (let i = 0; i <= words.length - n; i++) {
              
        //         let alreadyMatched = false;
        //         for (let j = i; j < i + n; j++) {
        //             if (removedIndices.has(j)) {
        //                 alreadyMatched = true;
        //                 break;
        //             }
        //         }
        //         if (alreadyMatched) continue;
                
        //         const phrase = words.slice(i, i + n).join(' ');
        //         const exactMatcher = new ExactMatcher(this.debugMode);
        //         const match = exactMatcher.findMatch(phrase, allTerms, canonicalMap);
                
        //         if (match) {
        //             if (this.debugMode) {
        //                 console.log("Exact style match found:", match);
        //             }
                    
        //             match.position = i;
        //             match.length = n;
        //             exactMatches.push(match);
                    
        //             for (let j = i; j < i + n; j++) {
        //                 removedIndices.add(j);
        //             }
        //         }
        //     }
        // }
        
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

    private cleanText(text: string): string {
        
        return text
            .replace(/[()[\]{}.,;:!?'"]/g, ' ') 
            .replace(/[^\w\s-]/g, ' ') 
            .replace(/\s+/g, ' ') 
            .trim(); 
    }

    public analyze(text: string): AnalysisResult {
        if (this.debugMode) {
            console.log("Starting analysis with text:", text); 
        }

        const cleanedText = this.cleanText(text);
        let currentText1 = cleanedText;
        
        const featuresResult1 = this.extractFeatures(currentText1);
        currentText1 = featuresResult1.remainingText;

        const productTypeResult1 = this.extractProductType(currentText1);
        currentText1 = productTypeResult1.remainingText;

        const brandResult1 = this.extractBrandName(currentText1);
        currentText1 = brandResult1.remainingText;


        const stylesResult1 = this.extractStyles(currentText1);
        currentText1 = stylesResult1.remainingText;

        let placesResult1 :any;
        
        if (this.placeTrie) {
           placesResult1 = this.extractDictionaryItems(currentText1, 'Place', this.placeTrie, 5);
            currentText1 = placesResult1.remainingText;
        }

        const productNameResult1 = this.extractProductName(currentText1);
    
        let currentText2 = cleanedText;
        
        const brandResult2 = this.extractBrandName(currentText2);
        currentText2 = brandResult2.remainingText;

        const productTypeResult2 = this.extractProductType(currentText2);
        currentText2 = productTypeResult2.remainingText;
        
        const featuresResult2 = this.extractFeatures(currentText2);
        currentText2 = featuresResult2.remainingText;
        
        const stylesResult2 = this.extractStyles(currentText2);
        currentText2 = stylesResult2.remainingText;
        

        let placesResult2  :  any; 
        
        if (this.placeTrie) {
             placesResult2 = this.extractDictionaryItems(currentText2, 'Place', this.placeTrie, 5);
            currentText2 = placesResult2.remainingText;
        }
        
        const productNameResult2 = this.extractProductName(currentText2);

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
                featureScore += 0.1; 
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
    public getTrieStats(): { [key: string]: any } {
        return {
            productType: this.productTypeTrie?.getStats(),
            brand: this.brandTrie?.getStats(),
            productName: this.productNameTrie?.getStats(),
            feature: this.featureTrie?.getStats(),
            style: this.styleTrie?.getStats(),
            place: this.placeTrie?.getStats()
        };
    }

    public refreshTries(): void {
        // Rebuild all Tries from current dictionaries
        this.dictionaries.forEach((dict, key) => {
            this.addDictionary(key, dict);
        });
        
        if (this.debugMode) {
            console.log("All Tries refreshed");
            console.log("Updated Trie statistics:", this.getTrieStats());
        }
    }
}

export default FurnitureAnalyzer;