const { Server } = require('socket.io');
const http = require('http');

// Environment configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = NODE_ENV === 'production' 
  ? [
      process.env.RAILWAY_PUBLIC_DOMAIN || process.env.PRODUCTION_DOMAIN || 'https://airrands-production.up.railway.app',
      process.env.APP_DOMAIN || 'https://app.airrands.com'
    ]
  : ['http://localhost:3000', 'http://localhost:19006', 'exp://localhost:19000'];

// Create HTTP server
const server = http.createServer();

// Initialize Socket.io with enhanced configuration
const io = new Server(server, { 
  cors: { 
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true
});

// Connection tracking
let connectedClients = new Map();
let totalConnections = 0;

// Middleware for logging and validation
io.use((socket, next) => {
  const clientId = socket.id;
  const timestamp = new Date().toISOString();
  
  // Add connection metadata
  socket.metadata = {
    connectedAt: timestamp,
    userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
    ip: socket.handshake.address || 'Unknown'
  };
  
  next();
});

// Connection event
io.on('connection', (socket) => {
  const clientId = socket.id;
  const timestamp = new Date().toISOString();
  
  // Track connection
  totalConnections++;
  connectedClients.set(clientId, {
    id: clientId,
    connectedAt: timestamp,
    rooms: new Set(),
    lastActivity: timestamp
  });
  
  // Join room for job tracking
  socket.on('join', ({ jobId, type, role }) => {
    if (!jobId) return;
    
    const roomName = `${type || 'job'}_${jobId}`;
    socket.join(roomName);
    
    // Track room membership
    const client = connectedClients.get(clientId);
    if (client) {
      client.rooms.add(roomName);
      client.lastActivity = timestamp;
    }
    
    // Emit room joined confirmation
    socket.emit('roomJoined', { room: roomName, jobId, type, role });
  });
  
  // Leave room
  socket.on('leave', ({ jobId, type, role }) => {
    const roomName = `${type || 'job'}_${jobId}`;
    socket.leave(roomName);
    
    // Update tracking
    const client = connectedClients.get(clientId);
    if (client) {
      client.rooms.delete(roomName);
      client.lastActivity = timestamp;
    }
  });
  
  // Status updates
  socket.on('statusUpdate', (data) => {
    if (!data.id) return;
    
    const roomName = `${data.type || 'job'}_${data.id}`;
    const client = connectedClients.get(clientId);
    if (client) {
      client.lastActivity = timestamp;
    }
    
    // Broadcast to room
    socket.to(roomName).emit('statusUpdate', {
      ...data,
      timestamp,
      updatedBy: clientId
    });
  });
  
  // Location updates
  socket.on('locationUpdate', (data) => {
    if (!data.id || !data.location) return;
    
    const roomName = `${data.type || 'job'}_${data.id}`;
    const client = connectedClients.get(clientId);
    if (client) {
      client.lastActivity = timestamp;
    }
    
    // Validate location data
    const { latitude, longitude } = data.location;
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return;
    }
    
    // Broadcast to room
    socket.to(roomName).emit('locationUpdate', {
      ...data,
      timestamp,
      updatedBy: clientId
    });
  });
  
  // Route updates
  socket.on('routeUpdate', (data) => {
    if (!data.id || !data.route) return;
    
    const roomName = `${data.type || 'job'}_${data.id}`;
    const client = connectedClients.get(clientId);
    if (client) {
      client.lastActivity = timestamp;
    }
    
    // Broadcast to room
    socket.to(roomName).emit('routeUpdate', {
      ...data,
      timestamp,
      updatedBy: clientId
    });
  });
  
  // Request updates
  socket.on('requestUpdate', (data) => {
    if (!data.jobId) return;
    
    const client = connectedClients.get(clientId);
    if (client) {
      client.lastActivity = timestamp;
    }
    
    // Emit update request to room
    const roomName = `${data.type || 'job'}_${data.jobId}`;
    socket.to(roomName).emit('updateRequested', {
      jobId: data.jobId,
      type: data.type,
      requestedBy: clientId,
      timestamp
    });
  });
  
  // Disconnect event
  socket.on('disconnect', (reason) => {
    // Clean up tracking
    const client = connectedClients.get(clientId);
    if (client) {
      connectedClients.delete(clientId);
    }
    
    totalConnections--;
  });
  
  // Error handling
  socket.on('error', (error) => {
    // Log errors in production
    if (NODE_ENV === 'production') {
      console.error(`Socket error for ${clientId}:`, error);
    }
  });
});

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: totalConnections,
      activeClients: connectedClients.size,
      uptime: process.uptime(),
      environment: NODE_ENV
    }));
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  if (NODE_ENV === 'production') {
    console.log(`🚀 Socket.io server running on port ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
  }
});

// Export for testing
module.exports = { io, server };