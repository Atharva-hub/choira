import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';
import apiRoutes from './routes/index.js';
import { sendSuccess } from './utils/apiResponse.js';

const app = express();

// ---- Global middleware (runs for every request, top to bottom) ----
app.use(helmet()); // sensible security headers
app.use(cors()); // allow browsers on other origins to call the API
app.use(express.json({ limit: '10kb' })); // parse JSON bodies, reject huge ones
if (env.nodeEnv !== 'test') {
  app.use(morgan('dev')); // request log in the terminal
}

// ---- Routes ----
app.get('/health', (req, res) => sendSuccess(res, { message: 'API is running' }));
app.use('/api', apiRoutes);

// ---- Error handling (must come after the routes) ----
app.use(notFound);
app.use(errorHandler);

export default app;
