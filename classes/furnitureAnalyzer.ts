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
                    return {
                        productType: match.canonicalForm,
                        matchDetails: match,
                        remainingText: remainingText
                    };
                }
            }
        }

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
        
        if (this.debugMode) {
            console.log("Analyzing text for brands:", text);
        }
        
        // Check for multi-word brand names first (longer phrases have priority)
        for (let n = 5; n >= 1; n--) {
            for (let i = 0; i <= words.length - n; i++) {
                const phrase = words.slice(i, i + n).join(' ');
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
            console.log("All potential brand matches:", potentialMatches);
        }
        
        if (potentialMatches.length > 0) {
            const bestMatch = potentialMatches[0];
            
            if (this.debugMode) {
                console.log(`[Best Brand Match] "${bestMatch.word}" => "${bestMatch.canonicalForm}" (${bestMatch.algorithm}, score: ${bestMatch.score.toFixed(3)})`);
            }
            
            // Create remaining text
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
        
        // First try exact multi-word matches (longer phrases have priority)
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

    public analyze(text: string): AnalysisResult {
        if (this.debugMode) {
            console.log("Starting analysis with text:", text);
        }

        const productTypeResult = this.extractProductType(text);
        let currentText = productTypeResult.remainingText;
        
        // Move brand extraction earlier in the process
        const brandResult = this.extractBrandName(currentText);
        currentText = brandResult.remainingText;

        
        const stylesResult = this.extractStyles(currentText);
        currentText = stylesResult.remainingText;
        
        const placesResult = this.extractDictionaryItems(currentText, 'Place', 5);
        currentText = placesResult.remainingText;
        
        const featuresResult = this.extractFeatures(currentText);
        currentText = featuresResult.remainingText;
        
        const productNameResult = this.extractProductName(currentText);
        
        const result: AnalysisResult = {
            places: placesResult.items,
            styles: stylesResult.styles,
            productType: productTypeResult.productType,
            features: featuresResult.features,
            brandName: brandResult.brandName,
            productName: productNameResult.productName,
            originalText: text,
            confidence: this.calculateConfidenceForAnalysis(text, brandResult.brandName !== null)
        };

        if (this.debugMode && productTypeResult.matchDetails) {
            result.matchDetails = productTypeResult.matchDetails;
        }

        return result;
    }

    private calculateConfidenceForAnalysis(text: string, hasBrand: boolean): number {
        const productTypeResult = this.extractProductType(text);
        const featuresResult = this.extractFeatures(text);
        const stylesResult = this.extractStyles(text);
        const placesResult = this.extractDictionaryItems(text, 'Place', 5);
        
        const analysis = {
            places: placesResult.items,
            productType: productTypeResult.productType,
            features: featuresResult.features,
            styles: stylesResult.styles,
            hasBrand: hasBrand
        };
        
        let confidenceScore = this.calculateConfidence(analysis);
        if (productTypeResult.matchDetails && productTypeResult.matchDetails.algorithm !== 'Exact') {
            const matchQualityFactor = productTypeResult.matchDetails.score;
            confidenceScore *= matchQualityFactor;
        }
        
        return confidenceScore;
    }

    private calculateConfidence(analysis: Record<string, any>): number {
        let score = 0;
    
        // Product type identified: +0.4 (increased from 0.3)
        if (analysis.productType) score += 0.4;
        
        // Brand identified: +0.3 (new factor)
        if (analysis.hasBrand) score += 0.3;
        
        // Styles identified: up to +0.15 (reduced from 0.3)
        score += Math.min(analysis.styles.length * 0.05, 0.15);
        
        // Places identified: up to +0.05 (reduced from 0.1)
        score += Math.min(analysis.places.length * 0.025, 0.05);
        
        // Features identified: up to +0.1 (reduced from 0.3)
        if (analysis.features && Array.isArray(analysis.features)) {
            score += Math.min(analysis.features.length * 0.02, 0.1);
        }
        
        return Math.min(score, 1.0);
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