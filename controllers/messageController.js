import Conversation from "../models/conversationModel.js";
import Message from "../models/messageModel.js";
import { getRecipientsSocketId, io } from "../socket/socket.js";

export async function sendMessage(req, res) {
    try {
        const { recipientId, message } = req.body;
        const senderId = req.user._id;

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] }
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, recipientId],
                lastMessage: {
                    sender: senderId,
                    text: message,
                }
            });
            await conversation.save();
        }

        const newMessage = await Message({
            conversationId: conversation._id,
            sender: senderId,
            text: message,
        });

        await Promise.all([
            newMessage.save(),
            conversation.updateOne({
                lastMessage: {
                    sender: senderId,
                    text: message,
                }
            })
        ]);

        const recipientSocketId = getRecipientsSocketId(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('newMessage', newMessage);
        }

        res.status(201).json(newMessage);

    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ error: error });
    }
}

export async function getMessages(req, res) {
    const { otherUserId } = req.params;
    const userId = req.user._id;

    try {
        const conversation = await Conversation.findOne({
            participants: { $all: [userId, otherUserId] }
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const messages = await Message.find({
            conversationId: conversation._id
        }).sort({ createdAt: 1 });

        return res.status(200).json(messages);
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ error: error });
    }
}

export async function getConversations(req, res) {
    const userId = req.user._id;

    try {
        const conversations = await Conversation.find({
            participants: userId
        }).populate({
            path: 'participants',
            select: 'username profilePic'
        }).sort({ updatedAt: -1 });

        // remove the current user from participants array
        conversations.forEach(conversation => {
            conversation.participants = conversation.participants.filter(participant => {
                return participant._id.toString() !== userId.toString();
            });
        });

        return res.status(200).json(conversations);
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ error: error });
    }
}