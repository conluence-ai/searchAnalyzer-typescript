import { Match } from "compromise/types/misc";
import { Dictionary, MatchResult } from "../../interface/searchInterface";

class TrieNode{
    public children: Map<string, TrieNode> = new Map();
    public isEndOfWord: boolean = false;
    public canonicalForm: string | null = null;
    public originalTerm: string | null = null;
    public depth: number = 0;

    constructor(depth: number = 0) {
        this.depth = depth;
    }
}


export class DictonaryTrie{
    private root : TrieNode;
    private dictionary: Dictionary | null;
    private debugMode: boolean;


    constructor(dictionary : Dictionary | null = null, debugMode: boolean = false){
        this.root = new TrieNode();
        this.dictionary = dictionary;
        this.debugMode = debugMode;

        if (dictionary) {
            this.buildTrie(dictionary);
        }
    }


    private buildTrie(dictionary: Dictionary) : void {
        const canonicalMap = dictionary?.getTermToCanonicalMap();
        const allTerms = dictionary?.getAllTerms() || [];
       
        if(!canonicalMap || !allTerms) {
            console.log("Dictionary is not defined or empty.");
            return;
        }

        allTerms.forEach((term)  => {
            this.insertTerm(term, canonicalMap.get(term) || term);
        })
    }

    private insertTerm(term: string, canonicalForm: string): void {
        const words = term.toLowerCase().split(/\s+/).filter(word => word.length > 0);

        let currentNode = this.root;

        for(let i = 0; i<words.length; i++){
            const word = words[i];

            if(!currentNode.children.has(word)){
                currentNode.children.set(word, new TrieNode(i + 1));
            }
            currentNode = currentNode.children.get(word)!;
        }

        currentNode.isEndOfWord = true;
        currentNode.canonicalForm = canonicalForm;
        currentNode.originalTerm = term;
    }

    /**
     * Finds the longest matching phrase starting from a specific position in the word array
     */

    public findLongestMatch(words: string[], startIndex : number) : MatchResult | null { 
        if(startIndex >= words.length) {
            return null;
        }

        let currentNode = this.root;
        let longestMatch: MatchResult | null = null;
        let matchLength = 0;

        for(let i = startIndex; i<words.length; i++){
            const word = words[i].toLowerCase();
            if (!currentNode.children.has(word)) {
                break;
            }

            currentNode = currentNode.children.get(word)!;
            matchLength++;

            if (currentNode.isEndOfWord && currentNode.canonicalForm) {
                longestMatch = {
                    word: words.slice(startIndex, startIndex + matchLength).join(' '),
                    match: currentNode.originalTerm || currentNode.canonicalForm,
                    canonicalForm: currentNode.canonicalForm,
                    algorithm: 'Trie',
                    score: 1.0, 
                    position: startIndex,
                    length: matchLength
                };

                if (this.debugMode) {
                    console.log(`Trie match found: "${longestMatch.word}" => "${longestMatch.canonicalForm}" (length: ${matchLength})`);
                }
            }
        }
        return longestMatch;
    } 


      /**
     * Finds all possible matches starting from a specific position
     */

    public findAllMatches(words: string[], startIndex: number): MatchResult[] {
        if (startIndex >= words.length) return [];

        const matches: MatchResult[] = [];
        let currentNode = this.root;
        let matchLength = 0;

        for (let i = startIndex; i < words.length; i++) {
            const word = words[i].toLowerCase();
            
            if (!currentNode.children.has(word)) {
                break;
            }

            currentNode = currentNode.children.get(word)!;
            matchLength++;

            if (currentNode.isEndOfWord && currentNode.canonicalForm) {
                matches.push({
                    word: words.slice(startIndex, startIndex + matchLength).join(' '),
                    match: currentNode.originalTerm || currentNode.canonicalForm,
                    canonicalForm: currentNode.canonicalForm,
                    algorithm: 'Trie',
                    score: 1.0,
                    position: startIndex,
                    length: matchLength
                });
            }
        }

        return matches;
    }


    public findByPrefix(prefix: string): string[] {
        const words = prefix.toLowerCase().split(/\s+/).filter(word => word.length > 0);
        let currentNode = this.root;

        for (const word of words) {
            if (!currentNode.children.has(word)) {
                return [];
            }
            currentNode = currentNode.children.get(word)!;
        }

        const results: string[] = [];
        this.collectAllTerms(currentNode, results);
        return results;
    }

    /**
     * Recursively collects all canonical forms from a node and its descendants
     */
    private collectAllTerms(node: TrieNode, results: string[]): void {
        if (node.isEndOfWord && node.canonicalForm) {
            results.push(node.canonicalForm);
        }

        node.children.forEach(child => {
            this.collectAllTerms(child, results);
        });
    }

      /**
     * Checks if a term exists in the Trie (exact match)
     */
      public contains(term: string): boolean {
        const words = term.toLowerCase().split(/\s+/).filter(word => word.length > 0);
        let currentNode = this.root;

        for (const word of words) {
            if (!currentNode.children.has(word)) {
                return false;
            }
            currentNode = currentNode.children.get(word)!;
        }

        return currentNode.isEndOfWord;
    }

      /** Gets the canonical form of a term if it exists*/
      public getCanonicalForm(term: string): string | null {
        const words = term.toLowerCase().split(/\s+/).filter(word => word.length > 0);
        let currentNode = this.root;

        for (const word of words) {
            if (!currentNode.children.has(word)) {
                return null;
            }
            currentNode = currentNode.children.get(word)!;
        }

        return currentNode.isEndOfWord ? currentNode.canonicalForm : null;
    }
    
    /* Updates the dictionary and rebuilds the Trie */
   public updateDictionary(dictionary: Dictionary): void {
       this.dictionary = dictionary;
       this.root = new TrieNode();
       this.buildTrie(dictionary);
   }


       /* Gets statistics about the Trie */
       public getStats(): { nodeCount: number, termCount: number, maxDepth: number } {
        let nodeCount = 0;
        let termCount = 0;
        let maxDepth = 0;

        const traverse = (node: TrieNode, depth: number) => {
            nodeCount++;
            maxDepth = Math.max(maxDepth, depth);
            
            if (node.isEndOfWord) {
                termCount++;
            }

            node.children.forEach(child => {
                traverse(child, depth + 1);
            });
        };

        traverse(this.root, 0);
        return { nodeCount, termCount, maxDepth };
    }
}