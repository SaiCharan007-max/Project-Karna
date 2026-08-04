import express from 'express';
import healthRoutes from './routes/health.routes.js';
import fileRoutes from './routes/files.routes.js';
// import cors from 'cors';
// import bodyParser from 'body-parser';
// import routes from './routes/index.js';

const app = express();
app.use("/", healthRoutes);
app.use("/files", fileRoutes);

// Uncomment the following lines if you want to enable CORS and body parsing

// app.use(cors());
// app.use(bodyParser.json());
// app.use('/api', routes);


export default app;
