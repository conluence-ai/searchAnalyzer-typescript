export interface DictionaryEntry {
    feature: string;
    synonyms: string[];
    spelling_variations: string[];
  }

  export interface PlaceDictionaryEntry extends DictionaryEntry {
    region: string;
  }


  export interface BrandEntry{
    id : number;
    name : string;
  }

  export interface ProductNameEntry{
    id : number;
    name : string;
    brandId: string;
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
    position?: number;
    length ?: number;
  }
  
  export interface AnalysisResult {
    productType: string | null;
    originalText: string;
    styles: string[];
    places: string[];
    features: string[];
    brandName ?: string | null;
    productName ?: string | null;
    confidence: number;
    matchDetails?: MatchResult;
  }
  
  export interface Dictionary {
    getName(): string;
    getEntries(): any[]; 
    getTermToCanonicalMap(): Map<string, string>;
    getAllTerms(): string[];
  }

  
