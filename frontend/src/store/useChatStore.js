import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  searchResults: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  typingUsers: [],
  searchQuery: "",
  messagesRead: {},

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  searchUsers: async (query) => {
    set({ searchQuery: query });
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    try {
      const res = await axiosInstance.get(`/messages/search?query=${encodeURIComponent(query)}`);
      set({ searchResults: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Search failed");
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      
      // Mark messages as read
      try {
        await axiosInstance.patch(`/messages/${userId}/read`);
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });

    socket.on("userTyping", (userId) => {
      if (userId === selectedUser._id) {
        const typingUsers = get().typingUsers;
        if (!typingUsers.includes(userId)) {
          set({ typingUsers: [...typingUsers, userId] });
        }
      }
    });

    socket.on("userStopTyping", (userId) => {
      if (userId === selectedUser._id) {
        set({ typingUsers: get().typingUsers.filter(id => id !== userId) });
      }
    });

    socket.on("messagesReadReceipt", (userId) => {
      set({ 
        messagesRead: {
          ...get().messagesRead,
          [userId]: true,
        }
      });
      // Update local messages to show as read
      set({
        messages: get().messages.map(msg =>
          msg.receiverId === userId ? { ...msg, isRead: true } : msg
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("userTyping");
    socket.off("userStopTyping");
    socket.off("messagesReadReceipt");
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser, searchResults: [], searchQuery: "" });
  },

  clearSearch: () => {
    set({ searchQuery: "", searchResults: [] });
  },
}));
