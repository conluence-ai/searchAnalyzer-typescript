import fs from 'fs';
import path from 'path';


export class ResultsFileHandler {
  private outputDir: string;
  private defaultFilename: string;
  
  constructor(outputDir: string = 'results', defaultFilename: string = 'analysis_results') {
    this.outputDir = outputDir;
    this.defaultFilename = defaultFilename;
    this.ensureOutputDirectoryExists();
  }
  

  private ensureOutputDirectoryExists(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`Created output directory: ${this.outputDir}`);
    }
  }
  
  saveResultsToJson(results: any[], filename?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const actualFilename = filename || `${this.defaultFilename}_${timestamp}.json`;
    const filePath = path.join(this.outputDir, actualFilename);
    
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    console.log(`Analysis results saved to: ${filePath}`);
    
    return filePath;
  }
  
  saveResultsToText(results: any[], filename?: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const actualFilename = filename || `${this.defaultFilename}_${timestamp}.txt`;
    const filePath = path.join(this.outputDir, actualFilename);
  
    const formattedResults = results.map((result, index) => {
      let output = `\n==== Result #${index + 1} ====\n`;
      output += `Query: "${result.query}"\n`;
      output += `Product Type: ${result.productType || "Unknown"}\n`;
      output += `Features: ${result.features?.length ? result.features.join(", ") : "None"}\n`;
      output += `Styles: ${result.styles?.length ? result.styles.join(", ") : "None"}\n`;
      output += `Places: ${result.places?.length ? result.places.join(", ") : "None"}\n`;
      
      if (result.brandName) {
        output += `Brand: ${result.brandName}\n`;
      }
      
      if (result.productName) {
        output += `Product: ${result.productName}\n`;
      }
      
      if (result.matchDetails) {
        output += `Match Details: "${result.matchDetails.word}" → "${result.matchDetails.match}" → "${result.matchDetails.canonicalForm}" `;
        output += `(${result.matchDetails.algorithm}, score: ${result.matchDetails.score.toFixed(3)})\n`;
      }
      
      output += `Confidence: ${result.confidence.toFixed(3)}`;
      return output;
    }).join('\n\n');
    
    fs.writeFileSync(filePath, formattedResults);
    console.log(`Analysis results saved to: ${filePath}`);
    
    return filePath;
  }

  saveResults(results: any[], baseFilename?: string): { jsonPath: string, textPath: string } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const actualBaseFilename = baseFilename || `${this.defaultFilename}_${timestamp}`;
    
    const jsonPath = this.saveResultsToJson(results, `${actualBaseFilename}.json`);
    const textPath = this.saveResultsToText(results, `${actualBaseFilename}.txt`);
    
    return { jsonPath, textPath };
  }
}
