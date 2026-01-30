import React, { useState, useRef, useEffect } from "react"
import axios from "axios"
import { useAuth } from "../context/AuthContext"
import Navbar from "../components/Navbar"
import "./css/Chat.css"

const CHAT_API = "http://localhost:8080/api/chat"

export default function Chat() {
  const { user, logout } = useAuth()
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI financial assistant. I can help you understand your spending habits, offer budgeting advice, and answer questions about your finances. How can I help you today?"
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [includeContext, setIncludeContext] = useState(true)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")

    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await axios.post(CHAT_API, {
        message: userMessage,
        includeExpenseContext: includeContext
      })

      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.data.response
      }])
    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    "How much did I spend this week?",
    "What's my biggest expense?",
    "Tips to save money",
    "Analyze my spending"
  ]

  return (
    <div className="chat-page">
      <Navbar />

      <div className="chat-container">
        <div className="chat-sidebar">
          <div className="sidebar-section">
            <h3>Settings</h3>
            <label className="toggle-option">
              <div className="toggle-info">
                <span className="toggle-label">Include expense data</span>
                <span className="toggle-desc">Let AI analyze your spending</span>
              </div>
              <div className={`toggle-switch ${includeContext ? 'active' : ''}`} onClick={() => setIncludeContext(!includeContext)}>
                <div className="toggle-handle"></div>
              </div>
            </label>
          </div>

          <div className="sidebar-section">
            <h3>Quick Questions</h3>
            <div className="quick-questions">
              {suggestedQuestions.map((q, i) => (
                <button key={i} onClick={() => setInput(q)} className="quick-btn">
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section tips">
            <h3>Tips</h3>
            <p>Ask me about your spending patterns, budget recommendations, or financial goals!</p>
          </div>
        </div>

        <div className="chat-main">
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === "assistant" ? (
                    <div className="avatar ai">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                        <path d="M12 2a7 7 0 0 1 7 7"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="avatar user">
                      {user?.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-author">
                      {msg.role === "assistant" ? "AI Assistant" : user?.name || "You"}
                    </span>
                  </div>
                  <div className="message-text">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">
                  <div className="avatar ai">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                      <path d="M12 2a7 7 0 0 1 7 7"/>
                    </svg>
                  </div>
                </div>
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-author">AI Assistant</span>
                  </div>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="input-form">
            <div className="input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your finances..."
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !input.trim()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <p className="input-hint">Press Enter to send</p>
          </form>
        </div>
      </div>
    </div>
  )
}
