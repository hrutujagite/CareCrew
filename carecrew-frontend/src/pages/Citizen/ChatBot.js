import React, { useState, useEffect, useRef } from 'react'

const BASE_URL = 'https://carecrew-1.onrender.com/api'

const ChatBot = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm SwasthBot 👋\nHow can I help you today? You can ask me about booking appointments, finding nearby hospitals, or anything about the SwasthSolapur portal."
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const sendMessage = async (textOverride) => {
    const text = (textOverride || input).trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const data = await res.json()

      if (data.success) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.reply }
        ])
      } else {
        throw new Error(data.message || 'Unknown error')
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment."
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickQuestions = [
    'How do I book an appointment?',
    'Which hospital has the most beds?',
    'How do I find the nearest hospital?',
    'How do I cancel my appointment?'
  ]

  return (
    <>
      {open && (
        <div
          className='fixed bottom-24 right-6 w-96 bg-white rounded-2xl
                     shadow-2xl border border-gray-200 flex flex-col
                     z-50 overflow-hidden'
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className='bg-blue-600 px-4 py-3 flex items-center
                          justify-between flex-shrink-0'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 bg-white rounded-full flex items-center
                              justify-center text-blue-600 font-bold text-sm'>
                S
              </div>
              <div>
                <p className='text-white font-semibold text-sm'>SwasthBot</p>
                <div className='flex items-center gap-1'>
                  <div className='w-1.5 h-1.5 bg-green-400 rounded-full' />
                  <p className='text-blue-100 text-xs'>Online</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className='text-blue-200 hover:text-white transition-colors text-lg'
            >✕</button>
          </div>

          {/* Messages */}
          <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-3'>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-2xl text-sm
                              leading-relaxed whitespace-pre-wrap
                              ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className='flex justify-start'>
                <div className='bg-gray-100 px-4 py-3 rounded-2xl
                                rounded-bl-sm flex items-center gap-1'>
                  <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
                       style={{ animationDelay: '0ms' }} />
                  <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
                       style={{ animationDelay: '150ms' }} />
                  <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
                       style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Quick questions — only on first open */}
            {messages.length === 1 && !loading && (
              <div className='flex flex-col gap-2 mt-1'>
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className='text-left text-xs text-blue-600 bg-blue-50
                               border border-blue-100 rounded-xl px-3 py-2
                               hover:bg-blue-100 transition-colors'
                  >{q}</button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className='border-t border-gray-200 p-3 flex gap-2 flex-shrink-0'>
            <input
              ref={inputRef}
              type='text'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ask me anything...'
              disabled={loading}
              className='flex-1 text-sm border border-gray-300 rounded-xl
                         px-3 py-2 focus:outline-none focus:ring-2
                         focus:ring-blue-500 disabled:opacity-50'
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className='bg-blue-600 hover:bg-blue-700 disabled:opacity-40
                         disabled:cursor-not-allowed text-white w-9 h-9
                         rounded-xl flex items-center justify-center
                         transition-colors flex-shrink-0'
            >
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none'
                   stroke='currentColor' strokeWidth='2.5'
                   strokeLinecap='round' strokeLinejoin='round'>
                <line x1='22' y1='2' x2='11' y2='13' />
                <polygon points='22 2 15 22 11 13 2 9 22 2' />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className='fixed bottom-6 right-6 w-14 h-14 bg-blue-600
                   hover:bg-blue-700 text-white rounded-full shadow-lg
                   flex items-center justify-center z-50
                   transition-all hover:scale-110 active:scale-95'
        title='Chat with SwasthBot'
      >
        {open ? (
          <svg width='20' height='20' viewBox='0 0 24 24' fill='none'
               stroke='currentColor' strokeWidth='2.5'
               strokeLinecap='round' strokeLinejoin='round'>
            <line x1='18' y1='6' x2='6' y2='18' />
            <line x1='6' y1='6' x2='18' y2='18' />
          </svg>
        ) : (
          <svg width='22' height='22' viewBox='0 0 24 24' fill='none'
               stroke='currentColor' strokeWidth='2'
               strokeLinecap='round' strokeLinejoin='round'>
            <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
          </svg>
        )}
      </button>
    </>
  )
}

export default ChatBot
