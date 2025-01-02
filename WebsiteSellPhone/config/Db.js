const mongoose = require('mongoose')

const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
      await mongoose.connect('mongodb://localhost:27017/test', {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });
      console.log('MongoDB connected successfully');
  } catch (err) {
      console.error('Failed to connect to MongoDB', err);
      process.exit(1);  
  }
};

module.exports = connectDB;