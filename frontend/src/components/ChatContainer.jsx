import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Paperclip } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.file && (
                <div className="mb-2">
                  {message.file.type.startsWith("image/") ? (
                    <img
                      src={message.file.url}
                      alt={message.file.name}
                      className="sm:max-w-[200px] rounded-md"
                    />
                  ) : message.file.type.startsWith("video/") ? (
                    <video controls className="sm:max-w-[200px] rounded-md">
                      <source src={message.file.url} type={message.file.type} />
                    </video>
                  ) : (
                    <a
                      href={message.file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-base-200 rounded-md hover:bg-base-300"
                    >
                      <Paperclip size={16} />
                      <span className="text-sm">{message.file.name}</span>
                      <span className="text-xs opacity-50">({(message.file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </a>
                  )}
                </div>
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
        {typingUsers.includes(selectedUser._id) && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img src={selectedUser.profilePic || "/avatar.png"} alt="profile pic" />
              </div>
            </div>
            <div className="chat-bubble">
              <div className="typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
