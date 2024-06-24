import { Server } from 'socket.io'
import http from 'http';
import express from 'express';
import Message from '../models/messageModel.js';
import Conversation from '../models/conversationModel.js';

const app = express();
const server = http.createServer(app);
// create a socket server and bind it with http server
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

const userSocketMap = {};

export const getRecipientsSocketId = (recipientId) => {
    return userSocketMap[recipientId];
}

io.on('connection', (socket) => {
    // console.log('a user connected', socket.id);

    const userId = socket.handshake.query.userId;

    if (userId !== 'undefined') {
        userSocketMap[userId] = socket.id;
    }

    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    socket.on('markMessageAsSeen', async({ conversationId, userId }) => {
        await Message.updateMany({
            conversationId,
            seen: false
        }, {
            $set: {seen: true}
        });

        await Conversation.updateOne({
            _id: conversationId,
        }, {
            $set: { "lastMessage.seen": true }
        })
        io.to(userSocketMap[userId]).emit('messageSeen', { conversationId })
    })

    socket.on('disconnect', () => {
        // console.log('user disconnected');
        delete userSocketMap[userId];
		io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, server, app }