import React, { useState, useRef, useEffect } from "react"
import axios from "axios"
import { useAuth } from "../context/AuthContext"
import Navbar from "../components/Navbar"
import "./css/Chat.css"
import budgetBot from "../assets/budget-bot.png"

const API_BASE = "http://localhost:8080/api/conversations"

const defaultMessage = {
  role: "assistant",
  content: "Hi! I'm your AI financial assistant. I can help you understand your spending habits, offer budgeting advice, and answer questions about your finances. How can I help you today?"
}

export default function Chat() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [messages, setMessages] = useState([defaultMessage])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [includeContext, setIncludeContext] = useState(true)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    setLoadingConversations(true)
    try {
      const res = await axios.get(API_BASE)
      setConversations(res.data || [])
    } catch (err) {
      console.error("Failed to load conversations:", err)
    } finally {
      setLoadingConversations(false)
    }
  }

  const loadConversation = async (id) => {
    try {
      const res = await axios.get(`${API_BASE}/${id}/messages`)
      const msgs = res.data || []
      if (msgs.length === 0) {
        setMessages([defaultMessage])
      } else {
        setMessages(msgs.map(m => ({ role: m.role, content: m.content })))
      }
      setCurrentConversationId(id)
    } catch (err) {
      console.error("Failed to load conversation:", err)
    }
  }

  const startNewChat = () => {
    setCurrentConversationId(null)
    setMessages([defaultMessage])
  }

  const deleteConversation = async (id, e) => {
    e.stopPropagation()
    try {
      await axios.delete(`${API_BASE}/${id}`)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (currentConversationId === id) {
        startNewChat()
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")

    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      let conversationId = currentConversationId

      // Create new conversation if needed
      if (!conversationId) {
        const createRes = await axios.post(API_BASE, { title: "New Chat" })
        conversationId = createRes.data.id
        setCurrentConversationId(conversationId)
      }

      // Send message and get response
      const response = await axios.post(`${API_BASE}/${conversationId}/messages`, {
        message: userMessage,
        includeExpenseContext: includeContext
      })

      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.data.response
      }])

      // Refresh conversations list to show updated title/order
      loadConversations()

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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  return (
    <div className="chat-page">
      <Navbar />

      <div className="chat-container">
        <div className="chat-sidebar">
          <button className="new-chat-btn" onClick={startNewChat}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Chat
          </button>

          <div className="sidebar-section">
            <h3>Conversations</h3>
            {loadingConversations ? (
              <div className="loading-conversations">Loading...</div>
            ) : conversations.length > 0 ? (
              <div className="conversations-list">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''}`}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <div className="conversation-info">
                      <span className="conversation-title">{conv.title}</span>
                      <span className="conversation-date">{formatDate(conv.updatedAt)}</span>
                    </div>
                    <button
                      className="delete-conv-btn"
                      onClick={(e) => deleteConversation(conv.id, e)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-conversations">No saved conversations</p>
            )}
          </div>

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
        </div>

        <div className="chat-main">
          <div className="messages-container">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === "assistant" ? (
                    <div className="avatar ai">
                      <img src={budgetBot} alt="AI Assistant" />
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
