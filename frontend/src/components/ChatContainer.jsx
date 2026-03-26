import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Paperclip, Check, CheckCheck } from "lucide-react";

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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 message-container">
        {messages.map((message, index) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"} message-item`}
            ref={index === messages.length - 1 ? messageEndRef : null}
            style={{
              animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
            }}
          >
            <div className="chat-image avatar">
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

            {/* Read Status Indicator */}
            {message.senderId === authUser._id && (
              <div className="chat-footer mt-1">
                {message.isRead ? (
                  <div className="text-xs text-green-500 flex items-center gap-1">
                    <CheckCheck size={14} />
                    Read
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <Check size={14} />
                    Sent
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="chat chat-start message-item" style={{ animation: "slideIn 0.3s ease-out" }}>
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

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes typing {
          0%, 60%, 100% {
            opacity: 0.5;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-10px);
          }
        }

        .typing span {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: currentColor;
          margin: 0 2px;
          animation: typing 1.4s infinite;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing span:nth-child(3) {
          animation-delay: 0.4s;
        }

        .message-item {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ChatContainer;
