import * as natural from "natural";
import { MatchResult } from "../../interface/searchInterface";
import TextMatcher from "../textMatcher";


class SoundExMatcher extends TextMatcher{
    private soundEx = new natural.SoundEx();

    findMatch(word: string, terms: string[], canonicalMap: Map<string, string>): MatchResult | null {

        try{
            const wordSoundex = this.soundEx.process(word);


            if (this.debugMode) {
                console.log(`[SoundEx] "${word}" soundex: ${wordSoundex}`);
              }

            for(const term of terms){
                const termSoundex = this.soundEx.process(term);

                if(termSoundex === wordSoundex){
                    if (this.debugMode) {
                        console.log(`[SoundEx] Match: "${word}" and "${term}" both have soundex ${wordSoundex}`);
                      }
                      const canonicalForm = canonicalMap.get(term) || term;

                      return {
                        word,
                        match: term,
                        canonicalForm,
                        score: 1.0, 
                        algorithm: 'SoundEx'
                      };
                }
            }
        }
        catch(error){
            if (this.debugMode) {
                console.error(`SoundEx error for "${word}":`, error);
              }
        }

        return null;
    }
}

export default SoundExMatcher;