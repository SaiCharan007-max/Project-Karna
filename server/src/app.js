import express from 'express';
import healthRoutes from './routes/health.routes.js';
import fileRoutes from './routes/files.routes.js';
import fileRetrievalRoutes from './routes/fileRetrieval.routes.js';
import chunksRoutes from './routes/chunks.routes.js';   
import cors from 'cors';
import bodyParser from 'body-parser';
import errorHandler from './middleware/errorHandler.js';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/", healthRoutes);
app.use("/files", fileRoutes);
app.use("/files", fileRetrievalRoutes);
app.use("/files", chunksRoutes); // Add the chunks routes to the app


app.use(errorHandler);


export default app;
