import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage, searchUsers, markMessagesAsRead } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/search", protectRoute, searchUsers);
router.get("/:id", protectRoute, getMessages);
router.patch("/:userId/read", protectRoute, markMessagesAsRead);

router.post("/send/:id", protectRoute, sendMessage);

export default router;
