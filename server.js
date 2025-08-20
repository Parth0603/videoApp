// Import required modules
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { v4: uuidV4 } = require('uuid'); // Import uuid

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server);

// --- Server Logic ---

// Serve the main HTML file for the root URL
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Serve the main HTML file for any room URL
// This allows users to join by simply opening a link
app.get('/:room', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle a user joining a room
    socket.on('join-room', (roomId) => {
        // A user can only be in one room at a time for this simple setup
        const rooms = Array.from(socket.rooms);
        if (rooms.length > 1) { // The first room is always the socket's own ID
            socket.leave(rooms[1]);
        }

        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Notify other users in the room that a new user has connected
        // We broadcast to everyone *except* the new user
        socket.to(roomId).emit('user-connected', socket.id);

        // --- WebRTC Signaling ---

        // Relay the offer to a specific user
        socket.on('offer', (userId, offer) => {
            console.log(`Relaying offer from ${socket.id} to ${userId}`);
            io.to(userId).emit('offer', socket.id, offer);
        });

        // Relay the answer back to the original caller
        socket.on('answer', (userId, answer) => {
            console.log(`Relaying answer from ${socket.id} to ${userId}`);
            io.to(userId).emit('answer', socket.id, answer);
        });

        // Relay ICE candidates
        socket.on('ice-candidate', (userId, candidate) => {
            io.to(userId).emit('ice-candidate', socket.id, candidate);
        });
    });

    // Handle user disconnection
    socket.on('disconnecting', () => {
        const rooms = Array.from(socket.rooms);
        if (rooms.length > 1) { // The first room is the socket's ID
            const room = rooms[1];
            // Notify others in the room that this user has disconnected
            socket.to(room).emit('user-disconnected', socket.id);
            console.log(`User ${socket.id} disconnected from room ${room}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});


// --- Start the Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});
