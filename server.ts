import express, { Request, Response } from "express";
import cors from "cors";
import bodyParser from 'body-parser';
import dotenv from "dotenv";
import FurnitureAnalyzer from "./classes/furnitureAnalyzer";

const app = express();
const port = process.env.PORT || 3000;


dotenv.config();
app.use(cors());
app.use(bodyParser.json());

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

export function configureRoutes(furnitureAnalyzer: FurnitureAnalyzer) {
    app.post('/api/analyze', async (req:Request, res:Response) => {
        try {
          const { text } = req.body;
          
          if (!text) {
             res.status(400).json({ 
              error: 'Missing required parameter: text' 
            });
          }
          
          if (!furnitureAnalyzer) {
            res.status(503).json({ 
              error: 'Analyzer service not initialized yet. Please try again later.' 
            });
          }
          
          const result = furnitureAnalyzer.analyze(text);
          res.json(result);
        } catch (error) {
          console.error('Error analyzing text:', error);
          res.status(500).json({ 
            error: 'Failed to analyze text',
            details: error instanceof Error ? error.message : String(error)
          });
        }
      })

      app.post('/api/analyze/batch', async(req : Request, res : Response) => {
        try{
            const {texts} = req.body;

            if (!texts || !Array.isArray(texts)) {
                res.status(400).json({ 
                  error: 'Missing or invalid parameter: texts must be an array' 
                });
              }

              if (!furnitureAnalyzer) {
                res.status(503).json({ 
                  error: 'Analyzer service not initialized yet. Please try again later.' 
                });
              }

              const results = texts.map((text : any )=> {
                try {
                  return furnitureAnalyzer.analyze(text);
                } catch (err) {
                  return { 
                    error: 'Failed to analyze text', 
                    text,
                    details: err instanceof Error ? err.message : String(err)
                  };
                }
              });

              res.json(results);
        }
        catch(error){
            console.error('Error processing batch analysis:', error);
            res.status(500).json({ 
                error: 'Failed to process batch analysis',
                details: error instanceof Error ? error.message : String(error)
              });
        }
      })
}


export function startServer() {
    return new Promise<void>((resolve) => {
        app.listen(port, () => {
          console.log(`Furniture Analyzer API running on port ${port}`);
          resolve();
        });
      });
}

export default app;