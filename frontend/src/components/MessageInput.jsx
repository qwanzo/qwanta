import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const { sendMessage, selectedUser } = useChatStore();
  const { socket } = useAuthStore();
  const typingTimeoutRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setFilePreview(null); // Clear file if image selected
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }
    setFilePreview(file);
    setImagePreview(null); // Clear image if file selected
  };

  const removeAttachment = () => {
    setImagePreview(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (selectedUser) {
      socket.emit("typing", selectedUser._id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stopTyping", selectedUser._id);
      }, 1000);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;

    if (selectedUser) socket.emit("stopTyping", selectedUser._id);

    try {
      const formData = new FormData();
      if (text.trim()) formData.append("text", text.trim());
      if (imagePreview) formData.append("image", imagePreview);
      if (filePreview) formData.append("file", filePreview);

      await sendMessage(formData);

      // Clear form
      setText("");
      setImagePreview(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="p-4 w-full">
      {(imagePreview || filePreview) && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center bg-base-200 rounded-lg border border-zinc-700">
                <Paperclip size={24} />
                <span className="ml-1 text-sm">{filePreview.name}</span>
              </div>
            )}
            <button
              onClick={removeAttachment}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={handleTextChange}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={imageInputRef}
            onChange={handleImageChange}
          />
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => imageInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${filePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
