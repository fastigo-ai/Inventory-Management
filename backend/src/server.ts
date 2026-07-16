import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import connectDB from './core/database';

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed!', err);
  });
