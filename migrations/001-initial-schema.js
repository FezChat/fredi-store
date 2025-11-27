import { config } from 'dotenv';
import mongoose from 'mongoose';

config();

const initialSchemaMigration = async () => {
  try {
    console.log('🚀 Starting initial schema migration...');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Create indexes for better performance
    console.log('📊 Creating indexes...');
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ createdAt: 1 });
    
    // Session indexes
    await db.collection('sessions').createIndex({ userId: 1, isRevoked: 1 });
    await db.collection('sessions').createIndex({ refreshToken: 1 });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    // Document indexes
    await db.collection('realtimedocs').createIndex({ createdBy: 1, createdAt: -1 });
    await db.collection('realtimedocs').createIndex({ 'collaborators.user': 1 });
    await db.collection('realtimedocs').createIndex({ isPublic: 1 });
    
    // Audit log indexes
    await db.collection('auditlogs').createIndex({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });
    await db.collection('auditlogs').createIndex({ userId: 1, timestamp: -1 });
    
    // File indexes
    await db.collection('files').createIndex({ uploader: 1, createdAt: -1 });
    await db.collection('files').createIndex({ isPublic: 1 });
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initialSchemaMigration();
}

export default initialSchemaMigration;
