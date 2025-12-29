// src/index.ts
import 'reflect-metadata';
import express, { Application, NextFunction, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { useContainer, useExpressServer } from 'routing-controllers';
import { Container } from 'typedi';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Assuming these files are created/refactored
import { AppErrorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/not-found';
import { ComicController } from './controllers/comic.controller';
import { SubscriberController } from './controllers/subscriber.controller';
import { GenreController } from './controllers/genre.controller';
import { TagController } from './controllers/tag.controller';
import { BlogController } from './controllers/blog.controller';
import { UserController } from './controllers/users.controller';
import response from './middlewares/response';
import { protect } from './middlewares/auth';
import { AdminStatsController } from './controllers/analytics.controller';

useContainer(Container);

const app: Application = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

mongoose.connect(process.env.MONGODB_URI!)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Global Express Middleware
app.use(helmet());

const corsOptions = {
  origin: '*',
  credentials: false,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
// Replace the morgan line with:
// app.use(morgan(':method :url :status :response-time ms - :res[content-length]', {
//   stream: process.stdout,
//   skip: (req) => req.method === 'OPTIONS'
// }));

app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

app.use(response);


app.get('/', (_req, res) => {
  return res.send('You have reached royal bird API server');
});

// Manual API Routes (for non-controller endpoints)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

app.get('/api/docs', (req, res) => {
  res.json({
    name: 'Royalbird Studios API',
    version: '1.0.0',
    documentation: 'https://docs.royalbirdstudios.com',
  });
});


// Setup Routing-Controllers
useExpressServer(app, {
  routePrefix: '/api',
  defaultErrorHandler: false,
  validation: {
    whitelist: true,
    forbidNonWhitelisted: false,
  },
  authorizationChecker: protect,
  // classTransformer: true,
  controllers: [
    SubscriberController,
    ComicController,
    GenreController,
    BlogController,
    TagController,
    UserController,
    AdminStatsController,
  ], 
  middlewares: [
    AppErrorHandler
  ],
});

// Global Error handler
app.use((error: Error, req: any, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(error);
  }
  
  console.error('Unhandled error; ', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    success: false,
    message: 'Internal Server Error', ...(NODE_ENV === 'development' && {
      error: error.message,
      stack: error.stack
    })
  });
});

export default app;