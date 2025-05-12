export interface DictionaryEntry {
    feature: string;
    synonyms: string[];
    spelling_variations: string[];
  }
  
  export interface ProductTypeEntry {
    type: string;
    synonyms: string[];
    spelling_variations: string[];
  }
  
  export interface MatchResult {
    word: string;
    match: string;
    canonicalForm: string;
    score: number;
    algorithm: string;
  }
  
  export interface AnalysisResult {
    productType: string | null;
    originalText: string;
    styles: string[];
    // places: string[];
    features: string[];
    confidence: number;
    matchDetails?: MatchResult;
  }
  
  // Dictionary interfaces for extensibility
  export interface Dictionary {
    getName(): string;
    getEntries(): any[]; 
    getTermToCanonicalMap(): Map<string, string>;
    getAllTerms(): string[];
  }

  
