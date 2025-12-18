import React, { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  language: string;
}

interface ChatInterfaceProps {
  documentInfo: any;
}

const API_BASE = "http://127.0.0.1:8000";

const ChatInterface: React.FC<ChatInterfaceProps> = ({ documentInfo }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<"en" | "hi" | "te">("en");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const languageNames = {
    en: "English",
    hi: "हिंदी",
    te: "తెలుగు",
  };

  useEffect(() => {
    // Initialize Web Speech API for voice input
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = language === "en" ? "en-IN" : language === "hi" ? "hi-IN" : "te-IN";

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      language,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: input,
          document_info: documentInfo,
          language: language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to get answer (${response.status})`);
      }

      const data = await response.json();
      
      // Check if there's an error in the response
      if (data.error) {
        console.error("API Error:", data.error);
        throw new Error(data.error);
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || "I apologize, but I couldn't generate an answer. Please try again.",
        sender: "assistant",
        language,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message || "Sorry, I encountered an error. Please check your OpenRouter API key in the .env file and try again.",
        sender: "assistant",
        language,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognition.start();
    }
  };

  const handlePlayAudio = async (text: string) => {
    try {
      const response = await fetch(`${API_BASE}/text-to-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-red-100 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Ask Questions About Your Document
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Language:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "te")}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:border-courtred-700 focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>
        </div>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
        style={{ maxHeight: "400px" }}
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-sm text-gray-500">
                Ask me anything about your legal document!
              </p>
              <p className="mt-2 text-xs text-gray-400">
                You can type your question or use voice input
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.sender === "user"
                  ? "bg-courtred-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              {message.sender === "assistant" && (
                <button
                  onClick={() => handlePlayAudio(message.text)}
                  className="mt-2 text-xs text-courtred-600 hover:text-courtred-700"
                  title="Play audio"
                >
                  🔊 Play
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 delay-75"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 delay-150"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Type your question in ${languageNames[language]}...`}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-courtred-700 focus:outline-none focus:ring-1 focus:ring-courtred-700"
            disabled={isLoading}
          />
          <button
            onClick={handleVoiceInput}
            disabled={isLoading || !recognition}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              isRecording
                ? "bg-red-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            title="Voice input"
          >
            {isRecording ? "⏹️" : "🎤"}
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="rounded-md bg-courtred-600 px-4 py-2 text-sm font-medium text-white hover:bg-courtred-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

