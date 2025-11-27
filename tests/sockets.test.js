import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as Client } from 'socket.io-client';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app, io } from '../src/server.js';
import User from '../src/models/User.js';

describe('Socket.IO Integration', () => {
  let clientSocket;
  let server;
  let testUser;
  let token;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/realtime-backend-test');
    server = createServer(app);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (server) server.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    
    // Create test user
    testUser = await User.create({
      name: 'Socket Test User',
      email: 'socket@example.com',
      password: 'Password123'
    });

    // Generate token
    token = jwt.sign(
      { userId: testUser._id.toString() }, 
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
    }
  });

  describe('Connection', () => {
    it('should connect with valid token', (done) => {
      clientSocket = Client('http://localhost:3000', {
        auth: {
          token: token
        }
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should not connect without token', (done) => {
      clientSocket = Client('http://localhost:3000');

      clientSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });
  });
});
