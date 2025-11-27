# Fredi Ezra Dev — Real-Time Backend

A production-ready real-time backend with authentication, WebSockets, and MongoDB. Built for horizontal scaling with conflict resolution and secure file storage.

## Features

- 🔐 **JWT Authentication** with refresh tokens and session management
- ⚡ **Real-time synchronization** using Socket.IO with conflict resolution
- 📄 **Document collaboration** with versioning and patch history
- 💾 **File storage** with GridFS (MinIO/S3 compatible)
- 🛡️ **Security best practices** - Helmet, CORS, rate limiting, input validation
- 🐳 **Docker ready** with MongoDB and Redis
- 📊 **Audit logging** for compliance and debugging
- 🔄 **Database transactions** for data consistency
- 📱 **Scalable architecture** with Redis adapter for multiple nodes

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6.0+
- Redis 7.0+ (optional, for clustering)

### Local Development

1. **Clone and install**
   ```bash
   git clone <repository>
   cd fredi-ezra-real-time-backend
   npm install
