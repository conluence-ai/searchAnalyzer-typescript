import * as natural from "natural"
import { AnalysisResult, Dictionary, MatchResult } from "../interface/searchInterface";
import TextMatcher from "./textMatcher";
import MatchingStrategy from "./matchingStrategy";
import JaroWrinklerMatcher from "./algorithms/jaroWrinklerTextMatcher";
import ExactMatcher from "./algorithms/exactMatcher";
import SoundExMatcher from "./algorithms/soundExMatcher";
import LevenshteinMatcher from "./algorithms/LevenshteinMatcher";

class FurnitureAnalyzer{
    private tokenizer: natural.WordTokenizer;
    private debugMode: boolean;
    private dictionaries: Map<string, Dictionary>;
    private matchingStrategy: MatchingStrategy;
    constructor(
        options : {
            dictonaries : {[key: string]: Dictionary},
            matchers?: TextMatcher[],
            debug ?: boolean
        }){
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

        private extractProductType(text: string): { productType: string | null, matchDetails?: MatchResult } {
    
            const productDict = this.dictionaries.get('ProductType');
            if (!productDict) {
              if (this.debugMode) {
                console.log("No product type dictionary available");
              }
              return { productType: null };
            }
            
            const words = text.toLowerCase().split(/\s+/);
            const canonicalMap = productDict.getTermToCanonicalMap();
            const allTerms = productDict.getAllTerms();
            
            if (this.debugMode) {
              console.log("Analyzing text:", text);
              console.log("Words:", words);
            }
            
            for (let n = 4; n >= 1; n--) {
              for (let i = 0; i <= words.length - n; i++) {
                const phrase = words.slice(i, i + n).join(' ');
                const exactMatcher = new ExactMatcher(this.debugMode);
                const match = exactMatcher.findMatch(phrase, allTerms, canonicalMap);
                
                if (match) {
                  return { 
                    productType: match.canonicalForm,
                    matchDetails: match
                  };
                }
              }
            }
            
           
            const potentialMatches: MatchResult[] = [];
            
            
            for (const word of words) {
              const match = this.matchingStrategy.findBestMatch(word, allTerms, canonicalMap);
              if (match) potentialMatches.push(match);
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
              
              return {
                productType: bestMatch.canonicalForm,
                matchDetails: bestMatch
              };
            }
            
            return { productType: null };
          }


          private extractDictionaryItems(text: string, dictionaryName: string, maxPhraseWords: number = 3): string[] {
            const dict = this.dictionaries.get(dictionaryName);
            if (!dict) return [];
            console.log("Extracting items from dictionary:", dict);
            const words = text.toLowerCase().split(/\s+/);
            const canonicalMap = dict.getTermToCanonicalMap();
            const items = new Set<string>();
            
            for (let n = maxPhraseWords; n >= 1; n--) {
              for (let i = 0; i <= words.length - n; i++) {
                const phrase = words.slice(i, i + n).join(' ');
                if (canonicalMap.has(phrase)) {
                  const canonical = canonicalMap.get(phrase) || phrase;
                  items.add(canonical);
                  i += n - 1; // Skip ahead to avoid overlaps
                }
              }
            }
            
            return Array.from(items);
          }

         

          private extractFeatures(text: string) {
            const featuresDict = this.dictionaries.get('Feature');
            if (!featuresDict) {
              if (this.debugMode) {
                console.log("No feature dictionary available");
              }
              return { features: [] };
            }
          
            const words = text.toLowerCase().split(/\s+/);
            const canonicalMap = featuresDict.getTermToCanonicalMap();
            const allTerms = featuresDict.getAllTerms();
            
            // Store all exact matches we find
            const exactMatches: MatchResult[] = [];
            
            // Check for n-gram exact matches (phrases of length 1 to 5)
            for (let n = 5; n >= 1; n--) {
              for (let i = 0; i <= words.length - n; i++) {
                const phrase = words.slice(i, i + n).join(' ');
                const exactMatcher = new ExactMatcher(this.debugMode);
                const match = exactMatcher.findMatch(phrase, allTerms, canonicalMap);
                
                if (match) {
                  console.log("Exact match found:", match);
                  exactMatches.push(match);
                }
              }
            }
            
            // If we found any exact matches, return them all
            if (exactMatches.length > 0) {
              return {
                features: exactMatches.map(match => match.canonicalForm),
                matchDetails: exactMatches
              };
            }
            
            // If no exact matches, proceed with fuzzy matching as before
            const potentialMatches: MatchResult[] = [];
            for (const word of words) {
              const match = this.matchingStrategy.findBestMatch(word, allTerms, canonicalMap);
              if (match) potentialMatches.push(match);
            }
            
            potentialMatches.sort((a, b) => b.score - a.score);
            const filteredMatches = potentialMatches.filter(match => match.score >= 0.9);
            
            console.log("Potential Matches from extract furniture:", filteredMatches);
            
            if (this.debugMode && filteredMatches.length > 0) {
              console.log("All potential matches:", filteredMatches);
            }
            
            if (filteredMatches.length > 0) {
              if (this.debugMode) {
                filteredMatches.forEach(match => {
                  console.log(`[Best Match] "${match.word}" => "${match.canonicalForm}" (${match.algorithm}, score: ${match.score.toFixed(3)})`);
                });
              }
              
              return {
                features: filteredMatches.map(match => match.canonicalForm),
                matchDetails: filteredMatches[0]
              };
            }
            
            return { features: [] };
          }

          private extractStyles(text: string) {
            const stylesDict = this.dictionaries.get('Style');
            if (!stylesDict) {
              if (this.debugMode) {
                console.log("No styles dictionary available");
              }
              return { styles: [] };
            }
          
            const words = text.toLowerCase().split(/\s+/);
            const canonicalMap = stylesDict.getTermToCanonicalMap();
            const allTerms = stylesDict.getAllTerms();
            
            // Store all exact matches we find
            const exactMatches: MatchResult[] = [];
            
            for (let n = 5; n >= 1; n--) {
              for (let i = 0; i <= words.length - n; i++) {
                const phrase = words.slice(i, i + n).join(' ');
                const exactMatcher = new ExactMatcher(this.debugMode);
                const match = exactMatcher.findMatch(phrase, allTerms, canonicalMap);
                
                if (match) {
                  console.log("Exact match found:", match);
                  exactMatches.push(match);
                }
              }
            }
            
            // If we found any exact matches, return them all
            if (exactMatches.length > 0) {
              return {
                styles: exactMatches.map(match => match.canonicalForm),
                matchDetails: exactMatches
              };
            }
            
            // If no exact matches, proceed with fuzzy matching as before
            const potentialMatches: MatchResult[] = [];
            for (const word of words) {
              const match = this.matchingStrategy.findBestMatch(word, allTerms, canonicalMap);
              if (match) potentialMatches.push(match);
            }
            
            potentialMatches.sort((a, b) => b.score - a.score);
            const filteredMatches = potentialMatches.filter(match => match.score >= 0.9);
            
            console.log("Potential Matches from extract styles:", filteredMatches);
            
            if (this.debugMode && filteredMatches.length > 0) {
              console.log("All potential matches:", filteredMatches);
            }
            
            if (filteredMatches.length > 0) {
              if (this.debugMode) {
                filteredMatches.forEach(match => {
                  console.log(`[Best Match] "${match.word}" => "${match.canonicalForm}" (${match.algorithm}, score: ${match.score.toFixed(3)})`);
                });
              }
              
              return {
                styles: filteredMatches.map(match => match.canonicalForm),
                matchDetails: filteredMatches[0]
              };
            }
            
            return { styles: [] };
          }

          public analyze(text : string) : AnalysisResult{
            const productTypeResult = this.extractProductType(text);
            const featuresResult = this.extractFeatures(text);
            const styleResult = this.extractStyles(text)
            const result: AnalysisResult = {
                productType: productTypeResult.productType,
                styles : styleResult.styles,
                features : featuresResult.features,
                originalText: text,
                confidence : this.calculateConfidenceForAnalysis(text)
            }

            if (this.debugMode && productTypeResult.matchDetails) {
                result.matchDetails = productTypeResult.matchDetails;
              }

            return result;
          }


          private calculateConfidenceForAnalysis(text: string): number {
            const productTypeResult = this.extractProductType(text);
            const featuresResult = this.extractFeatures(text);
            const stylesResult = this.extractStyles(text);
            const analysis = {
              productType: productTypeResult.productType,
              features:  featuresResult.features,
              styles: stylesResult.styles,
            //   places: this.extractDictionaryItems(text, 'Place'),
            };
            
            let confidenceScore = this.calculateConfidence(analysis);
            if (productTypeResult.matchDetails && productTypeResult.matchDetails.algorithm !== 'Exact') {

              const matchQualityFactor = productTypeResult.matchDetails.score;
              confidenceScore *= matchQualityFactor;
            }
            
            return confidenceScore;
          }


          private calculateConfidence(analysis: Record<string, any>) : number{
            let score = 0;
    
            // Product type identified: +0.3
            if (analysis.productType) score += 0.3;
            
            // Styles identified: up to +0.3
            score += Math.min(analysis.styles.length * 0.1, 0.3);
            
            // Places identified: up to +0.1
            // score += Math.min(analysis.places.length * 0.05, 0.1);
            
            // Check if attributes exists before accessing its properties
            if (analysis.attributes) {
              // Attributes identified: up to +0.3
              const attributeCount = 
                analysis.attributes.materials.length +
                analysis.attributes.colors.length +
                analysis.attributes.dimensions.length +
                analysis.attributes.features.length;
              
              score += Math.min(attributeCount * 0.03, 0.3);
            }
            
            // If features exist directly in analysis, count them too
            if (analysis.features && Array.isArray(analysis.features)) {
              score += Math.min(analysis.features.length * 0.03, 0.3);
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