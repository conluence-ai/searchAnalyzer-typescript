import { productTypes } from './dictonaries/productTypeDictonary';
import { featureDictionary } from './dictonaries/featuresDictonary';
import ProductTypeDictonary from "./classes/dictonary/productType"
import FurnitureAnalyzer from './classes/furnitureAnalyzer';
import FeatureDictionary from './classes/dictonary/featuresType';
import StyleDictonary from './classes/dictonary/stylesType';
import { styleDictionary } from './dictonaries/stylesDictonary';
import { placeDictionary } from './dictonaries/placesDictonary';
import PlaceTypeDictonary from './classes/dictonary/placeType';
import DatabaseAdapter from './classes/databaseAdapter';
import BrandDictionary from './classes/dictonary/brandDictonary';
import ProductNameDictionary from './classes/dictonary/productName';
import dotenv from 'dotenv';
import { ResultsFileHandler } from './ResultFileHandler';
import { configureRoutes, startServer } from './server';
dotenv.config();



async function initializeSystem() {
     const dbAdapter = new DatabaseAdapter(process.env.DB_URL as string);
     
     const brands = await dbAdapter.loadBrands();
     const productNames = await dbAdapter.loadProductNames();


     dbAdapter.close();


      const productType = new ProductTypeDictonary(productTypes);
      const featureDict = new FeatureDictionary(featureDictionary)
      const sylesDict= new StyleDictonary(styleDictionary)
      const placeDict = new PlaceTypeDictonary(placeDictionary)
      const brandDict = new BrandDictionary(brands);
      const productNameDict = new ProductNameDictionary(productNames)

      const analyzer = new FurnitureAnalyzer({
          dictonaries : {
              ProductType: productType,
              Feature : featureDict,
              Place : placeDict,
              Style : sylesDict,
              Brand : brandDict,
              ProductName : productNameDict
          },

          debug : false
      })

      
      
      
  //     if(process.env.NODE_ENV == 'dev'){
  //     const samples = [];
  //    const resultsHandler = new ResultsFileHandler()
  //   const allResults = samples.map(sample => {
  //     console.log("\n==== Analyzing:", sample, "====");
  //     const analysis = analyzer.analyze(sample);
      
  //     console.log("Identified Product Type:", analysis.productType);
  //     console.log("Identified Features:", analysis.features);
  //     console.log("Identified Styles:", analysis.styles);
  //     console.log("Identified Places:", analysis.places);
  //     console.log("Identified Brand Name:", analysis.brandName);
  //     console.log("Identified Product:", analysis.productName);
      
  //     if (analysis.matchDetails) {
  //       console.log("Match details:", 
  //                   `"${analysis.matchDetails.word}" → "${analysis.matchDetails.match}" → "${analysis.matchDetails.canonicalForm}"`,
  //                   `(${analysis.matchDetails.algorithm}, score: ${analysis.matchDetails.score.toFixed(3)})`);
  //     }
      
  //     console.log("Confidence Score:", analysis.confidence.toFixed(3));
      
  //     return {
  //       query: sample,
  //       ...analysis
  //     };
  //   });
  //   const savedPaths = resultsHandler.saveResults(allResults);
  //   console.log("\n==== Analysis Complete ====");
  //   console.log(`Analysis results saved as JSON: ${savedPaths.jsonPath}`);
  //   console.log(`Analysis results saved as Text: ${savedPaths.textPath}`);
  //  }

   return analyzer;
}

(async () => {
  const furnitureAnalyzer = await  initializeSystem();
  
  if (furnitureAnalyzer) {
    configureRoutes(furnitureAnalyzer)
    await startServer();
  } else {
    console.error('Failed to start server due to initialization errors');
    process.exit(1);
  }
})();


