import { Dictionary, ProductTypeEntry } from "../../interface/searchInterface";

class ProductTypeDictonary implements Dictionary {
    private entries: ProductTypeEntry[];
    private allTerms: string[];
    private termToCanonical: Map<string, string>;

    constructor(productTypes: ProductTypeEntry[]) {
        this.entries = productTypes;
        this.termToCanonical = new Map<string, string>();
        this.allTerms = this.getAllTerms();
      }

      getName(): string {
        return 'ProductType';
      }

      getEntries(): ProductTypeEntry[] {
        return this.entries;
      }


      getTermToCanonicalMap(): Map<string, string> {
        if (this.termToCanonical.size === 0) {
          this.entries.forEach(entry => {
            const canonical = entry.type;
            [entry.type, ...entry.synonyms, ...entry.spelling_variations].forEach(variant => {
              this.termToCanonical.set(variant.toLowerCase().trim(), canonical);
            });
          });
        }
        return this.termToCanonical;
      }


      getAllTerms(): string[] {
        if (!this.allTerms) {
          const terms: string[] = [];
          this.entries.forEach(entry => {
            terms.push(entry.type.toLowerCase());
            
            entry.synonyms.forEach(syn => {
              terms.push(syn.toLowerCase());
            });
            
            entry.spelling_variations.forEach(variation => {
              terms.push(variation.toLowerCase());
            });
          });
          this.allTerms = terms;
        }
        return this.allTerms;
      }
      
}

export default ProductTypeDictonary;