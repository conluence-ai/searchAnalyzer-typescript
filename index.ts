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


      const samples = [
        "soafa with rectagnlre arms and leather piping",
        "sofa of a gray color",
        "soifa with tufted back and rectangular arms",
        "somfa with low back or grounded back",
        "divan having l shape",
        "sofa with side supports",
        "sfoa wit chequered pattern",
        "sofa wtih crisscross pattern",
        "soifa with chstarfeld dsgni",
        "gofa with tufter panel having a rustive design",
        "sofa with contemporary design",
        "soifa with rectangular a design",
        "sfoa with strght back",
        "l-shaped sofa with stitching detail",
        "sofa with glass legs",
        "Ornate legs",
        "wing high back with metal detail",
        "marble legs",
        "castor legs sofa",
        "sofa with pillow arms",
        "industrial sofa with quilted arms exposed metal detail",
        "reclining back comtemporary sofa",
        "Splayed arms armchair",
        'channaled sofa with metal feet',
        'sofa with raised platform',
        "armless sofa",
        "folded arms and headrest",
        "brass detail",
        "sofa with relief stitching",
        "polished chrome rounded legs",
        "gold tapped legs armchair",
        "rattan back sofa",
        "diamond tufting sofa",
        "sofas with contemporary and mordern design having a tuffted back",
        "sofa having rectungular arms and tufted back",
        "Italian solid wood sofa",
        "amrchairs with l -shape for my factory",
        "sofs with wing back and slanted legs in modern theme",
        "modern amchai having flared arms abd high back and leather fabric with flat piping on sides",
        "otman chestar with tufted back and rectangular arms and by shake design",
        "sofa by minoti brand",
        "techni sofas with tufted back and rectangular arms",
        "sfoa from european brands with cruved back and round arms in modren style",
        "armchir from bolzan brand",
        "Bolzani sofas",
        "taching sofas",
        "yoisho",
        "yoisho sofas"

      ];
    
    
      samples.forEach(sample => {
        console.log("\n==== Analyzing:", sample, "====");
        const analysis = analyzer.analyze(sample);
        console.log("Identified Product Type:", analysis.productType);
        console.log("Identified Features:", analysis.features);
        console.log("Identified Styles:", analysis.styles);
        console.log("Identified Places:", analysis.places);
        console.log("Identified Brand Name:", analysis.brandName);
        console.log("Identified Product:", analysis.productName);
        if (analysis.matchDetails) {
          console.log("Match details:", 
                      `"${analysis.matchDetails.word}" → "${analysis.matchDetails.match}" → "${analysis.matchDetails.canonicalForm}"`,
                      `(${analysis.matchDetails.algorithm}, score: ${analysis.matchDetails.score.toFixed(3)})`);
        }
        console.log("Confidence Score:", analysis.confidence.toFixed(3));
      });
}

initializeSystem().catch(error => {
  console.error("Error initializing system:", error);
});


