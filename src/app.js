import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { getHealth } from './controllers/health.controller.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import apiRoutes from './routes/index.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', getHealth);
app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
