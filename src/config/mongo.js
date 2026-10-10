import mongoose from 'mongoose';
import env from './env.js';

export const connectMongo = async () => {
  await mongoose.connect(env.mongoUri);
  console.log('MongoDB connected');
};

export const disconnectMongo = () => mongoose.disconnect();
