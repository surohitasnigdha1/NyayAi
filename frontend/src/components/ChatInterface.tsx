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
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const languageNames = {
    en: "English",
    hi: "हिंदी",
    te: "తెలుగు",
  };

  useEffect(() => {
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

    const questionText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: questionText,
      sender: "user",
      language,
    };

    // Optimistic UI update - show user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add loading message for better UX
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: loadingMessageId,
      text: "Thinking...",
      sender: "assistant",
      language,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: questionText,
          document_info: documentInfo,
          language: language,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to get answer (${response.status})`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.error("API Error:", data.error);
        throw new Error(data.error);
      }
      
      const assistantMessage: Message = {
        id: loadingMessageId,
        text: data.answer || "I apologize, but I couldn't generate an answer. Please try again.",
        sender: "assistant",
        language,
      };

      // Replace loading message with actual response
      setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? assistantMessage : msg));
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: loadingMessageId,
        text: error.name === 'AbortError' 
          ? "Request timed out. Please try again with a shorter question."
          : error.message || "Sorry, I encountered an error. Please check your OpenRouter API key in the .env file and try again.",
        sender: "assistant",
        language,
      };
      // Replace loading message with error
      setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? errorMessage : msg));
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

  const handlePlayAudio = async (text: string, messageId: string) => {
    if (playingAudioId === messageId) return; // Prevent double-click
    
    setPlayingAudioId(messageId);
    
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
      
      // Preload audio for immediate playback
      audio.preload = "auto";
      
      // Set up event handlers before playing
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setPlayingAudioId(null);
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setPlayingAudioId(null);
      };
      
      // Play immediately
      try {
        await audio.play();
      } catch (playError) {
        console.error("Audio play error:", playError);
        setPlayingAudioId(null);
        URL.revokeObjectURL(audioUrl);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setPlayingAudioId(null);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white shadow-xl overflow-hidden border-2 border-red-100">
      {/* Modern Header */}
      <div className="red-gradient px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">
                Ask Questions
              </h3>
              <p className="text-xs text-white/80">Get instant answers about your document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-white">Language:</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "te")}
              className="rounded-lg border-0 bg-white/20 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-white focus:bg-white/30 focus:outline-none cursor-pointer"
            >
              <option value="en" className="text-gray-900">English</option>
              <option value="hi" className="text-gray-900">हिंदी</option>
              <option value="te" className="text-gray-900">తెలుగు</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 space-y-4 overflow-y-auto p-6 bg-gray-50"
        style={{ maxHeight: "400px" }}
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-md">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-accent-100">
                  <svg className="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </div>
              <p className="text-base font-semibold text-gray-900 mb-2">
                Ask me anything about your legal document!
              </p>
              <p className="text-sm text-gray-600">
                You can type your question or use voice input. I'll help you understand your document better.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            } animate-fade-in`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.sender === "user"
                  ? "bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg"
                  : "bg-white text-gray-900 shadow-md border border-gray-100"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
              {message.sender === "assistant" && (
                <button
                  onClick={() => handlePlayAudio(message.text, message.id)}
                  disabled={playingAudioId === message.id}
                  className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Play audio"
                >
                  {playingAudioId === message.id ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      🔊 Play Audio
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-md border border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500 [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500"></div>
                </div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`Type your question in ${languageNames[language]}...`}
            className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all"
            disabled={isLoading}
          />
          <button
            onClick={handleVoiceInput}
            disabled={isLoading || !recognition}
            className={`flex h-12 w-12 items-center justify-center rounded-xl font-medium transition-all ${
              isRecording
                ? "bg-red-500 text-white shadow-lg animate-pulse"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            title="Voice input"
          >
            {isRecording ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V7z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="flex h-12 items-center gap-2 rounded-xl red-gradient px-6 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
