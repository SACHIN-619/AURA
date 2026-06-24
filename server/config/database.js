// server/config/database.js — MongoDB connection with graceful error handling
import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Database Initialization Aborted: MONGODB_URI missing from environment setup file.');
    process.exit(1);
  }
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Drop wait freeze threshold to 5s max during scaling limits
      socketTimeoutMS: 45000,
    });
    
    console.log(`✅ MongoDB Connected: Cloud Host -> ${conn.connection.host} / Cluster Space -> ${conn.connection.name}`);
    
    // Smooth termination tracking sequence
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 Connection Terminated: Database client sockets gracefully unlinked.');
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Mongoose Cluster Handshake Failure:', err.message);
    process.exit(1);
  }
};

// Continuous connection monitoring listeners
mongoose.connection.on('disconnected', () => console.warn('⚠️  System Warning: Persistent connection drop detected on MongoDB link.'));
mongoose.connection.on('reconnected',  () => console.log('✅ System Recovery: MongoDB network state pipeline recovered successfully.'));

export default connectDB;