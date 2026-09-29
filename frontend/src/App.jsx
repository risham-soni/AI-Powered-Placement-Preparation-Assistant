import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  Plus,
  LogOut,
  Menu,
  X,
  Search,
  FileText,
  MessageSquare,
  Building2,
  Bot,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Code2,
  Cpu,
  Users2,
} from "lucide-react";

import "./App.css";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import UploadDocument from "./UploadDocument.jsx";

function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("All Companies");
  const [copiedIndex, setCopiedIndex] = useState(null);

  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [showRegister, setShowRegister] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile drawer
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop toggle

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const companies = [
    { name: "All Companies", tag: "ALL" },
    { name: "TCS", tag: "TCS" },
    { name: "Amazon", tag: "AMZN" },
    { name: "Microsoft", tag: "MSFT" },
    { name: "Google", tag: "GOOG" },
    { name: "Infosys", tag: "INFY" },
    { name: "Accenture", tag: "ACN" },
  ];

  const suggestedPromptCategories = [
    {
      category: "Data Structures & Algorithms",
      icon: <Code2 size={18} className="cat-icon cat-dsa" />,
      prompts: [
        "What DSA topics are asked in TCS interviews?",
        "What are the most frequent DSA patterns in Amazon SDE-1?",
        "Explain Dijkstra's shortest path algorithm with time complexity.",
      ],
    },
    {
      category: "Company Patterns & Syllabus",
      icon: <Building2 size={18} className="cat-icon cat-company" />,
      prompts: [
        "What is the format and syllabus of TCS NQT?",
        "What technical rounds are conducted by Microsoft for campus hires?",
        "What topics are asked in Google campus software engineering interviews?",
      ],
    },
    {
      category: "Core Computer Science",
      icon: <Cpu size={18} className="cat-icon cat-core" />,
      prompts: [
        "Explain ACID properties and transaction isolation levels in DBMS.",
        "What are the 4 pillars of OOP with practical examples?",
        "Difference between Process and Thread in Operating Systems.",
      ],
    },
    {
      category: "HR & Behavioral Rounds",
      icon: <Users2 size={18} className="cat-icon cat-hr" />,
      prompts: [
        "How should I answer 'Tell me about yourself' for a technical interview?",
        "How to explain a challenging engineering project using the STAR method?",
        "Why do you want to join Accenture? Sample high-scoring answer.",
      ],
    },
  ];

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load chat history
  useEffect(() => {
    const loadChatHistory = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      setHistoryLoading(true);
      try {
        const response = await fetch("http://localhost:5000/api/chat/history", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        setChatHistory(data.chats || []);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      } finally {
        setHistoryLoading(false);
      }
    };

    loadChatHistory();
  }, [isLoggedIn]);

  const sendQuestion = async (queryText) => {
    const textToSend = queryText || question;
    if (!textToSend.trim() || loading) return;

    setLoading(true);

    const userMessage = {
      role: "user",
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: textToSend,
          company: selectedCompany,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || "AI service request failed");
      }

      const assistantMessage = {
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
      };

      if (token) {
        try {
          const historyResponse = await fetch("http://localhost:5000/api/chat/history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              question: textToSend,
              answer: data.answer,
              company: selectedCompany,
            }),
          });

          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            setChatHistory((prev) => [historyData.chat, ...prev]);
          }
        } catch (historyErr) {
          console.error("Failed to save chat history:", historyErr);
        }
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error.message ||
            "Unable to connect to the AI service. Please make sure the FastAPI server is running on port 8000.",
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendQuestion();
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTextareaChange = (e) => {
    setQuestion(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const filteredChatHistory = chatHistory.filter((chat) =>
    chat.question.toLowerCase().includes(historySearch.toLowerCase())
  );

  if (!isLoggedIn) {
    if (showRegister) {
      return (
        <Register
          onBackToLogin={() => setShowRegister(false)}
        />
      );
    }

    return (
      <Login
        onLogin={(user) => {
          setIsLoggedIn(true);
          if (user) {
            setCurrentUser(user);
            localStorage.setItem("user", JSON.stringify(user));
          }
        }}
        onRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        {/* Sidebar Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo">
            <Sparkles size={20} className="sparkle-logo" />
            <span className="brand-name">PlacementAI</span>
          </div>
          <button
            type="button"
            className="sidebar-toggle-desktop"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            type="button"
            className="sidebar-close-mobile"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="sidebar-actions">
          <button
            type="button"
            className="btn-new-chat"
            onClick={() => {
              setMessages([]);
              setQuestion("");
              setShowUpload(false);
              setIsSidebarOpen(false);
            }}
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>

          <button
            type="button"
            className={`btn-nav-item ${showUpload ? "active" : ""}`}
            onClick={() => {
              setShowUpload(true);
              setIsSidebarOpen(false);
            }}
          >
            <FileText size={18} />
            <span>Document Hub</span>
          </button>

          {showUpload && (
            <button
              type="button"
              className="btn-nav-item active-chat"
              onClick={() => {
                setShowUpload(false);
                setIsSidebarOpen(false);
              }}
            >
              <MessageSquare size={18} />
              <span>Back to Chat</span>
            </button>
          )}
        </div>

        {/* History Search */}
        <div className="sidebar-search">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search chat history..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
          />
          {historySearch && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setHistorySearch("")}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Chat History List */}
        <div className="sidebar-history-container">
          <div className="history-header-label">
            <span>Recent Sessions</span>
            {chatHistory.length > 0 && (
              <span className="history-count">{chatHistory.length}</span>
            )}
          </div>

          <div className="history-list">
            {historyLoading && (
              <div className="history-empty">
                <div className="mini-spinner"></div>
                <span>Loading sessions...</span>
              </div>
            )}

            {!historyLoading && filteredChatHistory.length === 0 && (
              <div className="history-empty">
                <span>{historySearch ? "No matches found" : "No previous chats yet"}</span>
              </div>
            )}

            {!historyLoading &&
              filteredChatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className="history-card"
                  onClick={() => {
                    setShowUpload(false);
                    setIsSidebarOpen(false);
                    setMessages([
                      {
                        role: "user",
                        content: chat.question,
                      },
                      {
                        role: "assistant",
                        content: chat.answer,
                        sources: [],
                      },
                    ]);
                    if (chat.company) {
                      setSelectedCompany(chat.company);
                    }
                  }}
                >
                  <MessageSquare size={14} className="history-chat-icon" />
                  <div className="history-info">
                    <p className="history-title">{chat.question}</p>
                    {chat.company && (
                      <span className="history-tag">{chat.company}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-details">
              <span className="user-name">
                {currentUser?.name || "Student Prep"}
              </span>
              <span className="user-status">RAG Connected</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-logout"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              setIsLoggedIn(false);
              setMessages([]);
              setChatHistory([]);
            }}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-viewport">
        {/* Top Navbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="topbar-title-block">
              <h1 className="topbar-title">Placement Preparation Assistant</h1>
              <p className="topbar-subtitle">RAG-Powered Technical & HR Interview Intelligence</p>
            </div>
          </div>

          {/* Company Filter Pills */}
          {!showUpload && (
            <div className="company-pills-bar">
              <span className="pills-label">Target:</span>
              <div className="pills-scroll">
                {companies.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`company-pill ${selectedCompany === c.name ? "active" : ""}`}
                    onClick={() => setSelectedCompany(c.name)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* Main Body (Chat or Upload) */}
        {showUpload ? (
          <main className="content-scroll-area">
            <div className="centered-content-wrapper">
              <UploadDocument />
            </div>
          </main>
        ) : (
          <main className="chat-scroll-area">
            <div className="chat-content-wrapper">
              {/* Welcome Screen */}
              {messages.length === 0 && (
                <div className="chat-welcome">
                  <div className="welcome-hero-badge">
                    <Sparkles size={16} />
                    <span>Interview Readiness AI</span>
                  </div>

                  <h2>How can I help you prepare today?</h2>
                  <p className="welcome-desc">
                    Ask any question regarding DSA, coding rounds, company patterns, core CS subjects, or college brochures.
                  </p>

                  <div className="prompt-grid">
                    {suggestedPromptCategories.map((cat, idx) => (
                      <div key={idx} className="category-card">
                        <div className="category-header">
                          {cat.icon}
                          <h3>{cat.category}</h3>
                        </div>
                        <div className="category-prompts">
                          {cat.prompts.map((p, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              className="prompt-chip"
                              onClick={() => {
                                setQuestion(p);
                                sendQuestion(p);
                              }}
                            >
                              <span>{p}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Feed */}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`message-row ${message.role === "user" ? "user-row" : "assistant-row"}`}
                >
                  <div className="message-avatar">
                    {message.role === "user" ? (
                      <User size={18} />
                    ) : (
                      <Bot size={18} className="bot-avatar-icon" />
                    )}
                  </div>

                  <div className="message-bubble">
                    <div className="message-header-row">
                      <span className="sender-name">
                        {message.role === "user" ? "You" : "Placement Assistant"}
                      </span>
                      {message.role === "assistant" && (
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => copyToClipboard(message.content, index)}
                          title="Copy answer"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check size={14} className="copied-check" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="message-body markdown-body">
                      {message.role === "assistant" ? (
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>

                    {message.sources && message.sources.length > 0 && (
                      <div className="sources-container">
                        <div className="sources-title">
                          <FileText size={13} />
                          <span>Referenced Documents</span>
                        </div>
                        <div className="source-chips">
                          {message.sources.map((source, sIdx) => (
                            <div key={sIdx} className="source-tag">
                              <span className="source-doc-name">{source.document}</span>
                              <span className="source-page-badge">Page {source.page}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Thinking / Loading State */}
              {loading && (
                <div className="message-row assistant-row">
                  <div className="message-avatar">
                    <Bot size={18} className="bot-avatar-icon spin-subtle" />
                  </div>
                  <div className="message-bubble thinking-bubble">
                    <div className="thinking-row">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className="thinking-text">
                        Consulting {selectedCompany === "All Companies" ? "knowledge base" : `${selectedCompany} documents`} & formulating answer...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </main>
        )}

        {/* Input Dock (Only when in chat view) */}
        {!showUpload && (
          <div className="input-dock-container">
            <div className="input-dock-wrapper">
              <div className="input-capsule">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask a placement question (Filter: ${selectedCompany})...`}
                  rows={1}
                  disabled={loading}
                />

                <button
                  type="button"
                  className="btn-send"
                  onClick={() => sendQuestion()}
                  disabled={loading || !question.trim()}
                  aria-label="Send query"
                >
                  <Send size={18} />
                </button>
              </div>

              <div className="input-hints">
                <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for a new line</span>
                <span className="dot-divider">•</span>
                <span>Active Filter: <strong>{selectedCompany}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;