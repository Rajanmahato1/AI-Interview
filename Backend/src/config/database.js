const mongoose = require('mongoose');
const dns = require('dns');
const config = require('./index');

// Use reliable public DNS (Google & Cloudflare) for MongoDB SRV resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Fallback to default system DNS if custom servers fail
}

const connectDB = async () => { 
  try {
    const conn = await mongoose.connect(config.MONGODB_URI);
    console.log(`MongoDB Connected Successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;