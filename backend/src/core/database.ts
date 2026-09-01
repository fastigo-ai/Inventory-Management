import mongoose from 'mongoose';

const connectDB = async (retries = 5) => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/erp_system';
  
  // Connection event listeners
  mongoose.connection.on('connected', () => {
    console.log(`\nMongoDB connected !! DB HOST: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected! Attempting to reconnect...');
  });

  while (retries > 0) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
      return; // Exit loop on success
    } catch (error) {
      console.error(`MongoDB connection FAILED. Retries left: ${retries - 1}`, error);
      retries -= 1;
      
      if (retries === 0) {
        console.error('Max retries reached. Exiting application.');
        process.exit(1);
      }
      
      // Wait for 5 seconds before retrying
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

export default connectDB;
