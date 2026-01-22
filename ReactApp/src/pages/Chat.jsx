import React, { useState, useRef, useEffect } from "react"
import axios from "axios"
import { Link } from "react-router-dom"
import "./css/Chat.css"

const CHAT_API = "http://localhost:8080/api/chat"

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your financial assistant. I can help you understand your spending habits, offer budgeting advice, or just chat. How can I help you today?"
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

    // Add user message to chat
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
    "What's my biggest expense category?",
    "Give me tips to save money",
    "Analyze my spending habits"
  ]

  const handleSuggestion = (question) => {
    setInput(question)
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <Link to="/" className="back-link">← Back to Expenses</Link>
        <h2>Financial Assistant</h2>
        <label className="context-toggle">
          <input
            type="checkbox"
            checked={includeContext}
            onChange={(e) => setIncludeContext(e.target.checked)}
          />
          Include my expense data
        </label>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="suggestions">
          <p>Try asking:</p>
          <div className="suggestion-chips">
            {suggestedQuestions.map((q, i) => (
              <button key={i} onClick={() => handleSuggestion(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me about your finances..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
