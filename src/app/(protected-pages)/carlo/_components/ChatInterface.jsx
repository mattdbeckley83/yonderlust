'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PiLightning, PiMapTrifold, PiChatCircle, PiWarningCircle } from 'react-icons/pi'
import { getConversation } from '@/server/actions/carlo/getConversation'
import { sendMessage } from '@/server/actions/carlo/sendMessage'
import { createConversation } from '@/server/actions/carlo/createConversation'
import { getFeedback } from '@/server/actions/carlo/submitFeedback'
import UpgradeGearModal from './UpgradeGearModal'
import TripPlanningModal from './TripPlanningModal'
import MessageFeedback from './MessageFeedback'
import ContextFooter from './ContextFooter'

export default function ChatInterface({
    conversationId,
    items = [],
    trips = [],
    tripItems = {},
    categories = [],
    activities = [],
    userActivityNames = [],
    itemTypes = {},
}) {
    const router = useRouter()
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
    const [tripModalOpen, setTripModalOpen] = useState(false)
    const [feedbackData, setFeedbackData] = useState({})
    const [selectedContext, setSelectedContext] = useState({
        gearIds: [],
        foodIds: [],
        tripIds: [],
        activityIds: [],
    })
    const [subscriptionLimitReached, setSubscriptionLimitReached] = useState(false)
    const messagesEndRef = useRef(null)
    const textareaRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        if (conversationId) {
            loadConversation(conversationId)
        } else {
            setMessages([])
        }
    }, [conversationId])

    const loadConversation = async (id) => {
        setIsFetching(true)
        const [conversationResult, feedbackResult] = await Promise.all([
            getConversation(id),
            getFeedback(id),
        ])
        setIsFetching(false)

        if (conversationResult.success) {
            setMessages(conversationResult.messages)
        }
        if (feedbackResult.feedback) {
            setFeedbackData(feedbackResult.feedback)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const message = inputValue.trim()
        if (!message || isLoading) return

        setInputValue('')
        setIsLoading(true)

        // If no active conversation, create one first
        let activeConversationId = conversationId
        if (!activeConversationId) {
            const createResult = await createConversation()
            if (createResult.success && createResult.conversation) {
                activeConversationId = createResult.conversation.id
                startTransition(() => {
                    router.push(`/carlo?id=${activeConversationId}`)
                })
            } else {
                setIsLoading(false)
                return
            }
        }

        // Add user message to UI immediately
        const userMessage = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: message,
            created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, userMessage])

        // Send message to API with context
        const result = await sendMessage(activeConversationId, message, selectedContext)

        if (result.success) {
            // Add assistant response
            const assistantMessage = {
                id: `temp-${Date.now()}-assistant`,
                role: 'assistant',
                content: result.message,
                created_at: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, assistantMessage])
            router.refresh() // Refresh to update conversation title in sidebar
        } else if (result.error === 'subscription_limit_reached') {
            // Handle subscription limit - show upgrade prompt
            setSubscriptionLimitReached(true)
            // Remove the user message we just added since it wasn't processed
            setMessages((prev) => prev.slice(0, -1))
            // Put the message back in the input
            setInputValue(message)
        } else {
            // Show error message
            const errorMessage = {
                id: `temp-${Date.now()}-error`,
                role: 'assistant',
                content: `Error: ${result.error}`,
                created_at: new Date().toISOString(),
                isError: true,
            }
            setMessages((prev) => [...prev, errorMessage])
        }

        setIsLoading(false)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    const handleTemplateSubmit = async ({ template, prompt }) => {
        setIsLoading(true)

        // Create conversation with template type
        const createResult = await createConversation(template)
        if (!createResult.success || !createResult.conversation) {
            setIsLoading(false)
            return
        }

        const newConversationId = createResult.conversation.id
        startTransition(() => {
            router.push(`/carlo?id=${newConversationId}`)
        })

        // Add user message to UI immediately
        const userMessage = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: prompt,
            created_at: new Date().toISOString(),
        }
        setMessages([userMessage])

        // Send the template prompt with context
        const result = await sendMessage(newConversationId, prompt, selectedContext)

        if (result.success) {
            const assistantMessage = {
                id: `temp-${Date.now()}-assistant`,
                role: 'assistant',
                content: result.message,
                created_at: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, assistantMessage])
            router.refresh()
        } else {
            const errorMessage = {
                id: `temp-${Date.now()}-error`,
                role: 'assistant',
                content: `Error: ${result.error}`,
                created_at: new Date().toISOString(),
                isError: true,
            }
            setMessages((prev) => [...prev, errorMessage])
        }

        setIsLoading(false)
    }

    if (!conversationId && messages.length === 0) {
        return (
            <>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center max-w-xl">
                            <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                                <PiChatCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                                Welcome to Carlo! I'm your personal{' '}
                                <RotatingActivity activities={userActivityNames} />{' '}
                                advisor
                                <br />
                                with expertise in gear, trip planning, and nutrition.
                            </p>

                            {/* Quick Start Header */}
                            <div className="text-xs text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">Quick Start</div>

                            {/* Template Buttons */}
                            <div className="flex justify-center gap-3 mb-6">
                                <button
                                    onClick={() => setUpgradeModalOpen(true)}
                                    className="w-44 flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
                                >
                                    <PiLightning className="w-6 h-6 text-amber-500" />
                                    <div className="text-center">
                                        <div className="font-medium text-gray-900 dark:text-white text-sm">Upgrade Gear</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Get replacement recommendations</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setTripModalOpen(true)}
                                    className="w-44 flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
                                >
                                    <PiMapTrifold className="w-6 h-6 text-green-500" />
                                    <div className="text-center">
                                        <div className="font-medium text-gray-900 dark:text-white text-sm">Trip Planning</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Get advice for your trip</div>
                                    </div>
                                </button>
                            </div>

                            {/* Context Hint */}
                            <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
                                <p>Add your gear and trips to the <span className="font-medium">Context</span> below</p>
                                <p className="flex items-center justify-center gap-1 mt-1">
                                    before asking a custom question
                                    <svg className="w-3 h-3 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Context Footer */}
                    <ContextFooter
                        items={items}
                        trips={trips}
                        tripItems={tripItems}
                        activities={activities}
                        categories={categories}
                        itemTypes={itemTypes}
                        selectedContext={selectedContext}
                        onContextChange={setSelectedContext}
                    />

                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <form onSubmit={handleSubmit}>
                            <div className="flex gap-2">
                                <textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask Carlo anything about backpacking..."
                                    rows={1}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isLoading}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Send
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Template Modals */}
                <UpgradeGearModal
                    isOpen={upgradeModalOpen}
                    onClose={() => setUpgradeModalOpen(false)}
                    onSubmit={handleTemplateSubmit}
                />
                <TripPlanningModal
                    isOpen={tripModalOpen}
                    onClose={() => setTripModalOpen(false)}
                    onSubmit={handleTemplateSubmit}
                />
            </>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
                {isFetching ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <p>Start the conversation by sending a message</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message, index) => {
                            // Find the preceding user message for context
                            let userQuery = null
                            if (message.role === 'assistant') {
                                for (let i = index - 1; i >= 0; i--) {
                                    if (messages[i].role === 'user') {
                                        userQuery = messages[i].content
                                        break
                                    }
                                }
                            }

                            return (
                                <MessageBubble
                                    key={message.id}
                                    message={message}
                                    conversationId={conversationId}
                                    userQuery={userQuery}
                                    existingFeedback={feedbackData[message.id]}
                                />
                            )
                        })}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">C</span>
                                </div>
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Context Footer */}
            <ContextFooter
                items={items}
                trips={trips}
                tripItems={tripItems}
                activities={activities}
                categories={categories}
                itemTypes={itemTypes}
                selectedContext={selectedContext}
                onContextChange={setSelectedContext}
            />

            {/* Subscription Limit Banner */}
            {subscriptionLimitReached && (
                <div className="mx-4 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-3">
                        <PiWarningCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-medium text-amber-800 dark:text-amber-200">
                                Monthly conversation limit reached
                            </h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                You've used all 5 free conversations this month. Upgrade to Trailblazer for unlimited conversations with Carlo.
                            </p>
                            <div className="mt-3 flex gap-3">
                                <Link
                                    href="/profile"
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Upgrade to Trailblazer
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setSubscriptionLimitReached(false)}
                                    className="px-4 py-2 text-sm text-amber-700 dark:text-amber-300 hover:underline"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSubmit}>
                    <div className="flex gap-2">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={subscriptionLimitReached ? "Upgrade to continue chatting..." : "Type your message..."}
                            rows={1}
                            disabled={subscriptionLimitReached}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isLoading || subscriptionLimitReached}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                'Send'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function MessageBubble({ message, conversationId, userQuery, existingFeedback }) {
    const isUser = message.role === 'user'
    const isError = message.isError
    const showFeedback = !isUser && !isError && conversationId

    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isUser ? 'bg-gray-200 dark:bg-gray-600' : 'bg-indigo-100 dark:bg-indigo-900'
            }`}>
                <span className={`text-xs font-medium ${isUser ? 'text-gray-600 dark:text-gray-300' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {isUser ? 'U' : 'C'}
                </span>
            </div>
            <div className="max-w-[80%]">
                <div className={`rounded-lg px-4 py-3 ${
                    isUser
                        ? 'bg-indigo-600 text-white'
                        : isError
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}>
                    <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                    </div>
                </div>
                {showFeedback && (
                    <MessageFeedback
                        conversationId={conversationId}
                        messageId={message.id}
                        messageContent={message.content}
                        userQuery={userQuery}
                        existingFeedback={existingFeedback}
                    />
                )}
            </div>
        </div>
    )
}

function RotatingActivity({ activities }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    // Default to "Backpacking" if no activities selected
    const activityList = activities.length > 0 ? activities : ['Backpacking']

    useEffect(() => {
        if (activityList.length <= 1) return

        const interval = setInterval(() => {
            // Fade out
            setIsVisible(false)

            // After fade out, change text and fade in
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % activityList.length)
                setIsVisible(true)
            }, 300)
        }, 2500)

        return () => clearInterval(interval)
    }, [activityList.length])

    return (
        <span
            className={`font-bold text-gray-900 dark:text-white inline-block transition-opacity duration-300 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
        >
            {activityList[currentIndex]}
        </span>
    )
}
