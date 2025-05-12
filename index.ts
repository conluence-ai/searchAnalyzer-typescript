import * as natural from 'natural';
import { productTypes } from './dictonaries/productTypeDictonary';
import { featureDictionary } from './dictonaries/featuresDictonary';
import ProductTypeDictonary from "./classes/dictonary/productType"
import FurnitureAnalyzer from './classes/furnitureAnalyzer';
import FeatureDictionary from './classes/dictonary/featuresType';
import StyleDictonary from './classes/dictonary/stylesType';
import { styleDictionary } from './dictonaries/stylesDictonary';



const productType = new ProductTypeDictonary(productTypes);
const featureDict = new FeatureDictionary(featureDictionary)
const sylesDict= new StyleDictonary(styleDictionary)

const analyzer = new FurnitureAnalyzer({
    dictonaries : {
        ProductType: productType,
        Feature : featureDict,
        Style : sylesDict
    },

    debug : false
})


const samples = [
    // "soafa with rectagnlre arms and leather piping",
    // "sofa of a gray color"
    // "soifa with tufted back and rectangular arms",
    // "somfa with low back or grounded back",
    // "divan having l shape",
    // "sofa with side supports",
    // "sfoa wit chequered pattern"
    // "sofa wtih crisscross pattern",
    // "soifa with chstarfeld dsgni",
    // "gofa with tufter panel having a rustive design",
    // "sofa with contemporary design",
    // "soifa with rectangular a design"
  ];


  samples.forEach(sample => {
    console.log("\n==== Analyzing:", sample, "====");
    const analysis = analyzer.analyze(sample);
    console.log("Identified Product Type:", analysis.productType);
    console.log("Identified Features:", analysis.features);
    console.log("Identified Styles:", analysis.styles);
    if (analysis.matchDetails) {
      console.log("Match details:", 
                  `"${analysis.matchDetails.word}" → "${analysis.matchDetails.match}" → "${analysis.matchDetails.canonicalForm}"`,
                  `(${analysis.matchDetails.algorithm}, score: ${analysis.matchDetails.score.toFixed(3)})`);
    }
    console.log("Confidence Score:", analysis.confidence.toFixed(3));
  });
    