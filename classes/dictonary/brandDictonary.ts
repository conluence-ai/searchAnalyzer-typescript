import { BrandEntry, Dictionary } from "../../interface/searchInterface";

class BrandDictionary implements Dictionary {
    private entries: BrandEntry[];
    private termToCanonical: Map<string, string>;
    private allTerms: string[];
    
    constructor(brands: BrandEntry[]) {
      this.entries = brands;
      this.termToCanonical = new Map<string, string>();
      this.allTerms = [];
      this.initializeDictionary();
    }
    
    private initializeDictionary(): void {
      this.entries.forEach(entry => {
        const canonical = entry.name;
        this.termToCanonical.set(entry.name.toLowerCase().trim(), canonical);
        this.allTerms.push(entry.name.toLowerCase());
      });
    }
    
    getName(): string {
      return 'Brand';
    }
    
    getEntries(): BrandEntry[] {
      return this.entries;
    }
    
    getTermToCanonicalMap(): Map<string, string> {
      return this.termToCanonical;
    }
    
    getAllTerms(): string[] {
      return this.allTerms;
    }
  }
  
  export default BrandDictionary;