"use client";

import { useState, useRef, useEffect } from "react";
import { SendHorizonal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function HomePage() {
  const [messages, setMessages] = useState<{ sender: string; text: string | any[] }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const MEMORY_LIMIT = 5; 

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setTyping(true);

    try {
      const recentHistory = [...messages, userMessage]
        .slice(-MEMORY_LIMIT) // only last N turns
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text
        }));

      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: input,
          history: recentHistory
        }),
      });

      const data = await res.json();
      setLoading(false);

      setTimeout(() => {
        setMessages((prev) => [...prev, { sender: "bot", text: data.result }]);
        setTyping(false);
      }, 800);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { sender: "bot", text: "⚠️ Error fetching data." }]);
      setLoading(false);
      setTyping(false);
    }
  };

  const renderMessage = (msg: { sender: string; text: string | any[] }) => {
    // Table rendering
    if (Array.isArray(msg.text) && msg.text.length > 0 && typeof msg.text[0] === "object") {
      const headers = Object.keys(msg.text[0]);
      return (
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 border-b border-gray-300 dark:border-gray-600 text-left font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {msg.text.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  {headers.map((h) => (
                    <td key={h} className="px-4 py-2 border-b border-gray-300 dark:border-gray-600">
                      {String(row[h])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Markdown-style rendering for long plain text
    if (typeof msg.text === "string") {
      return (
        <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
              code: ({node, ...props}) => (
                <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded" {...props} />
              ),
              ul: ({node, ...props}) => (
                <ul className="list-disc ml-5 space-y-1" {...props} />
              ),
              ol: ({node, ...props}) => (
                <ol className="list-decimal ml-5 space-y-1" {...props} />
              )
            }}
          >{msg.text}</ReactMarkdown>
        </div>
      );
    }

    // Fallback for any unknown format
    return <span>{String(msg.text)}</span>;
  };

  return (
    <div className={`flex flex-col h-screen`}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-3 bg-blue-600 text-white dark:bg-gray-900">
        <h1 className="text-lg font-semibold">LangQuery</h1>
      </nav>

      {/* Title Section */}
      <div className="px-6 py-4 bg-gray-100 dark:bg-gray-800 w-full text-center shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
          AI-Powered Database Insights
        </h2>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 flex flex-col items-center overflow-hidden">
        <div className="shadow-lg rounded-xl w-[70%] flex flex-col h-[90%] bg-white dark:bg-gray-900 mt-4">
          
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800 no-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-lg shadow-sm fade-in ${
                    msg.sender === "user"
                      ? "bg-blue-200 text-black rounded-br-none"
                      : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-gray-600"
                  }`}
                >
                  {renderMessage(msg)}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                <span className="dot"></span>
                <span className="dot delay-150"></span>
                <span className="dot delay-300"></span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="bg-white dark:bg-gray-900 dark:border-gray-700 p-3">
            <div className="relative flex items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())
                }
                className="w-full resize-none border dark:border-gray-700 rounded-lg px-3 py-2 pr-12 focus:outline-none focus:ring focus:ring-blue-300 max-h-[150px] overflow-y-auto no-scrollbar bg-white dark:bg-gray-800 dark:text-white"
                rows={1}
              />
              <div className="absolute right-2 bottom-2">
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="text-blue-500 hover:text-blue-600 disabled:opacity-50"
                >
                  <SendHorizonal className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dot {
          width: 8px;
          height: 8px;
          background-color: gray;
          border-radius: 50%;
          display: inline-block;
          animation: bounce 0.6s infinite alternate;
        }
        .delay-150 {
          animation-delay: 0.15s;
        }
        .delay-300 {
          animation-delay: 0.3s;
        }
        @keyframes bounce {
          to {
            transform: translateY(-4px);
          }
        }
        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
