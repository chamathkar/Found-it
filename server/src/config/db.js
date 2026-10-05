const mongoose = require('mongoose');
const dns = require('dns');

// On Windows / certain ISPs, Node.js querySrv fails on MongoDB Atlas SRV URIs.
// Configure fallback public DNS servers for SRV resolution.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not permitted
}

let mongod = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusrecover';

  try {
    console.log(`[Database] Connecting to MongoDB...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.warn(`[Database] Could not connect to primary MongoDB URI (${uri}): ${err.message}`);
    
    // In production, fail immediately instead of silently storing data in volatile memory
    if (process.env.NODE_ENV === 'production') {
      console.error('[Database] In-memory database fallback is disabled in production.');
      throw err;
    }

    // Fallback to mongodb-memory-server for local zero-config execution
    try {
      console.log('[Database] Starting in-memory MongoDB server fallback...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to In-Memory MongoDB at ${memoryUri}`);
      return conn;
    } catch (memErr) {
      console.error('[Database] Failed to initialize in-memory fallback:', memErr.message);
      throw err;
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};

module.exports = { connectDB, disconnectDB };
