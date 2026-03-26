import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Allow all file types, but check size
    cb(null, true);
  },
});

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Get all messages from this user (both sent and received)
    const messages = await Message.find({
      $or: [
        { senderId: loggedInUserId },
        { receiverId: loggedInUserId },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("senderId", "fullName profilePic email")
      .populate("receiverId", "fullName profilePic email");

    // Get unique users from messages and organize by chat
    const userMap = new Map();
    messages.forEach((msg) => {
      const otherUser = msg.senderId._id.toString() === loggedInUserId.toString() ? msg.receiverId : msg.senderId;
      if (otherUser && !userMap.has(otherUser._id.toString())) {
        userMap.set(otherUser._id.toString(), {
          ...otherUser.toObject(),
          lastMessage: msg,
        });
      }
    });

    // Get all other users and add them if not in recent chats
    const allUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    allUsers.forEach((user) => {
      if (!userMap.has(user._id.toString())) {
        userMap.set(user._id.toString(), {
          ...user.toObject(),
          lastMessage: null,
        });
      }
    });

    const users = Array.from(userMap.values()).sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(0);
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(0);
      return bTime - aTime;
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const loggedInUserId = req.user._id;

    if (!query || query.trim() === "") {
      return res.status(200).json([]);
    }

    const searchResults = await User.find({
      _id: { $ne: loggedInUserId },
      $or: [
        { fullName: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("-password");

    res.status(200).json(searchResults);
  } catch (error) {
    console.error("Error in searchUsers: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    // Mark all messages from userId to myId as read
    await Message.updateMany(
      {
        senderId: userId,
        receiverId: myId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    // Emit read receipt to sender
    const senderSocketId = getReceiverSocketId(userId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", myId);
    }

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.log("Error in markMessagesAsRead: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = [
  upload.single("file"),
  async (req, res) => {
    try {
      const { text, image } = req.body;
      const { id: receiverId } = req.params;
      const senderId = req.user._id;

      let imageUrl;
      if (image) {
        // Upload base64 image to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      }

      let fileData = null;
      if (req.file) {
        // Upload file to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
          resource_type: "auto",
          public_id: `file_${Date.now()}_${req.file.originalname}`,
        });
        fileData = {
          url: uploadResponse.secure_url,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
        };
      }

      const newMessage = new Message({
        senderId,
        receiverId,
        text,
        image: imageUrl,
        file: fileData,
        isRead: false,
      });

      await newMessage.save();

      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
      }

      res.status(201).json(newMessage);
    } catch (error) {
      console.log("Error in sendMessage controller: ", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }
];
