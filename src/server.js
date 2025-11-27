import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import './config/index.js';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import socketHandler from './sockets/index.js';
import rateLimitMiddleware from './middleware/rateLimit.js';
import { errorHandler } from './middleware/auth.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: process.env.UPLOAD_LIMIT || '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimitMiddleware);

// Static files
app.use(express.static('public'));

// API Routes
app.use('/api/v1/auth', authRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io setup
socketHandler(io);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, io };
