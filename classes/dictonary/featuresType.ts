import { Dictionary, DictionaryEntry, ProductTypeEntry } from "../../interface/searchInterface";

class FeatureDictionary implements Dictionary{
    private entries: DictionaryEntry[];
    private termToCanonical: Map<string, string>;
    private allTerms: string[];


    constructor(features: DictionaryEntry[]) {
        this.entries = features;
        this.termToCanonical = new Map<string, string>();
        this.allTerms = this.getAllTerms();
      }

      getName(): string {
        return 'Feature';
      }

      getEntries(): DictionaryEntry[] {
        return this.entries;
      }

      getTermToCanonicalMap(): Map<string, string> {
        if (this.termToCanonical.size === 0) {
          this.entries.forEach(entry => {
            [entry.feature, ...entry.synonyms, ...entry.spelling_variations].forEach(variant => {
              this.termToCanonical.set(variant.toLowerCase().trim(), entry.feature);
            });
          });
        }
        return this.termToCanonical;
      }

      getAllTerms(): string[] {
        if (!this.allTerms) {
          const terms: string[] = [];
          this.entries.forEach(entry => {
            terms.push(entry.feature.toLowerCase());
            
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


export default FeatureDictionary;