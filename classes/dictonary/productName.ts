import { Dictionary, ProductNameEntry } from "../../interface/searchInterface";


class ProductNameDictionary implements Dictionary {
    private entries: ProductNameEntry[];
    private termToCanonical: Map<string, string>;
    private allTerms: string[]
    
    constructor(products: ProductNameEntry[]) {
      this.entries = products;
      this.termToCanonical = new Map<string, string>();
      this.allTerms = [];
      this.initializeDictionary();
    }
    
    private initializeDictionary(): void {
      this.entries.forEach(entry => {
        const canonical = entry.name;
        this.termToCanonical.set(entry.name.toLowerCase().trim(), canonical);
        this.allTerms.push(entry.name.toLowerCase())
      
      });
    }
    
    getName(): string {
      return 'ProductName';
    }
    
    getEntries(): ProductNameEntry[] {
      return this.entries;
    }
    
    getTermToCanonicalMap(): Map<string, string> {
      return this.termToCanonical;
    }
    
    getAllTerms(): string[] {
      return this.allTerms;
    }
    
  }
  
  export default ProductNameDictionary;