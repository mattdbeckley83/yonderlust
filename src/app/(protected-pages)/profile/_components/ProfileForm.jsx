'use client'

import { useState, useTransition } from 'react'
import Card from '@/components/ui/Card'
import Checkbox from '@/components/ui/Checkbox'
import Button from '@/components/ui/Button'
import { updateActivities } from '@/server/actions/profile/updateActivities'
import { updateAiContext } from '@/server/actions/profile/updateAiContext'
import { createPortalSession } from '@/server/actions/stripe/createPortalSession'
import { createCheckoutSession } from '@/server/actions/stripe/createCheckoutSession'

const MAX_ACTIVITY_NOTES_LENGTH = 500
const MAX_AI_CONTEXT_LENGTH = 1000

const PLAN_DISPLAY_NAMES = {
    explorer: 'Explorer',
    trailblazer: 'Trailblazer',
}

const STATUS_DISPLAY = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    trialing: { label: 'Trial', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    canceled: { label: 'Canceled', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
    past_due: { label: 'Past Due', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

const ProfileForm = ({
    user,
    subscription,
    activities,
    selectedActivityIds: initialSelectedIds,
    activityNotes: initialActivityNotes = {},
}) => {
    const [selectedIds, setSelectedIds] = useState(new Set(initialSelectedIds))
    const [activityNotes, setActivityNotes] = useState(initialActivityNotes)
    const [expandedNotes, setExpandedNotes] = useState(new Set())
    const [aiContext, setAiContext] = useState(user.aiContext || '')
    const [isPending, startTransition] = useTransition()
    const [saveStatus, setSaveStatus] = useState(null)
    const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false)

    const handleActivityToggle = (activityId, checked) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (checked) {
                next.add(activityId)
            } else {
                next.delete(activityId)
                // Remove notes when unchecking
                setActivityNotes((prevNotes) => {
                    const newNotes = { ...prevNotes }
                    delete newNotes[activityId]
                    return newNotes
                })
                // Collapse if expanded
                setExpandedNotes((prev) => {
                    const next = new Set(prev)
                    next.delete(activityId)
                    return next
                })
            }
            return next
        })
        setSaveStatus(null)
    }

    const handleNoteChange = (activityId, value) => {
        if (value.length <= MAX_ACTIVITY_NOTES_LENGTH) {
            setActivityNotes((prev) => ({
                ...prev,
                [activityId]: value,
            }))
            setSaveStatus(null)
        }
    }

    const toggleNoteExpanded = (activityId) => {
        setExpandedNotes((prev) => {
            const next = new Set(prev)
            if (next.has(activityId)) {
                next.delete(activityId)
            } else {
                next.add(activityId)
            }
            return next
        })
    }

    const handleAiContextChange = (value) => {
        if (value.length <= MAX_AI_CONTEXT_LENGTH) {
            setAiContext(value)
            setSaveStatus(null)
        }
    }

    const handleSave = () => {
        startTransition(async () => {
            // Save activities with notes
            const activitiesResult = await updateActivities(
                Array.from(selectedIds),
                activityNotes
            )

            // Save AI context
            const contextResult = await updateAiContext(aiContext)

            if (activitiesResult.success && contextResult.success) {
                setSaveStatus('success')
                setTimeout(() => setSaveStatus(null), 3000)
            } else {
                setSaveStatus('error')
            }
        })
    }

    const hasChanges = () => {
        // Check activity selection changes
        const initial = new Set(initialSelectedIds)
        if (initial.size !== selectedIds.size) return true
        for (const id of selectedIds) {
            if (!initial.has(id)) return true
        }

        // Check activity notes changes
        for (const activityId of selectedIds) {
            const currentNote = activityNotes[activityId] || ''
            const initialNote = initialActivityNotes[activityId] || ''
            if (currentNote !== initialNote) return true
        }

        // Check AI context changes
        if (aiContext !== (user.aiContext || '')) return true

        return false
    }

    const truncateText = (text, maxLength = 50) => {
        if (!text || text.length <= maxLength) return text
        return text.substring(0, maxLength) + '...'
    }

    const handleManageSubscription = async () => {
        setIsSubscriptionLoading(true)
        try {
            const result = await createPortalSession()
            if (result.url) {
                window.location.href = result.url
            } else if (result.error) {
                console.error('Error creating portal session:', result.error)
                alert('Unable to open subscription management. Please try again.')
            }
        } catch (error) {
            console.error('Error managing subscription:', error)
            alert('Unable to open subscription management. Please try again.')
        } finally {
            setIsSubscriptionLoading(false)
        }
    }

    const handleUpgrade = async (priceType) => {
        setIsSubscriptionLoading(true)
        try {
            const result = await createCheckoutSession(priceType)
            if (result.url) {
                window.location.href = result.url
            } else if (result.error) {
                console.error('Error creating checkout session:', result.error)
                alert('Unable to start checkout. Please try again.')
            }
        } catch (error) {
            console.error('Error starting checkout:', error)
            alert('Unable to start checkout. Please try again.')
        } finally {
            setIsSubscriptionLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 max-w-2xl">
            {/* Account Information */}
            <Card>
                <div className="flex flex-col gap-4">
                    <h2 className="text-lg font-semibold">Account Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-500 dark:text-gray-400">
                                Name
                            </label>
                            <p className="font-medium">
                                {user.firstName || user.lastName
                                    ? `${user.firstName} ${user.lastName}`.trim()
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm text-gray-500 dark:text-gray-400">
                                Email
                            </label>
                            <p className="font-medium">{user.email || '—'}</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* My Activities */}
            <Card>
                <div className="flex flex-col gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">My Activities</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Select the outdoor activities you enjoy. Carlo uses this to personalize recommendations.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activities.map((activity) => {
                            const isSelected = selectedIds.has(activity.id)
                            const isExpanded = expandedNotes.has(activity.id)
                            const note = activityNotes[activity.id] || ''
                            const hasNote = note.trim().length > 0

                            return (
                                <div
                                    key={activity.id}
                                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={(checked) =>
                                                handleActivityToggle(activity.id, checked)
                                            }
                                        >
                                            <span className="text-sm font-medium">{activity.name}</span>
                                        </Checkbox>

                                        {isSelected && (
                                            <button
                                                type="button"
                                                onClick={() => toggleNoteExpanded(activity.id)}
                                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                                            >
                                                {isExpanded ? '[- Hide]' : '[+ Add details]'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Collapsed preview */}
                                    {isSelected && !isExpanded && hasNote && (
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic pl-6">
                                            {truncateText(note)}
                                        </p>
                                    )}

                                    {/* Expanded textarea */}
                                    {isSelected && isExpanded && (
                                        <div className="mt-3 pl-6">
                                            <textarea
                                                value={note}
                                                onChange={(e) => handleNoteChange(activity.id, e.target.value)}
                                                placeholder={`Tell Carlo more about your ${activity.name} style... (optional)`}
                                                rows={2}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            <div className="flex justify-end mt-1">
                                                <span className={`text-xs ${note.length > MAX_ACTIVITY_NOTES_LENGTH - 50 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                    {note.length}/{MAX_ACTIVITY_NOTES_LENGTH}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </Card>

            {/* Anything else Carlo should know */}
            <Card>
                <div className="flex flex-col gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">Anything else Carlo should know?</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Optional - helps Carlo give better recommendations
                        </p>
                    </div>

                    <div>
                        <textarea
                            value={aiContext}
                            onChange={(e) => handleAiContextChange(e.target.value)}
                            placeholder="Body size, dietary restrictions, location, budget preferences, physical limitations, etc."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <div className="flex justify-end mt-1">
                            <span className={`text-xs ${aiContext.length > MAX_AI_CONTEXT_LENGTH - 100 ? 'text-amber-500' : 'text-gray-400'}`}>
                                {aiContext.length}/{MAX_AI_CONTEXT_LENGTH}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Subscription Management */}
            <div className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-orange-500">Subscription Management</h2>
                <Card className={`border-2 ${subscription?.status === 'active' || subscription?.status === 'trialing' ? 'border-green-500 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'}`}>
                    <div className="flex flex-col gap-4">
                        <h3 className="text-base font-semibold text-orange-500">Your Subscription</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400">
                                    Plan
                                </label>
                                <p className="font-medium">
                                    {PLAN_DISPLAY_NAMES[subscription?.plan] || 'Explorer'}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400">
                                    Status
                                </label>
                                <div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_DISPLAY[subscription?.status]?.className || STATUS_DISPLAY.active.className}`}>
                                        {STATUS_DISPLAY[subscription?.status]?.label || 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Show trial end date or subscription renewal date */}
                        {subscription?.status === 'trialing' && subscription?.trialEndsAt && (
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400">
                                    Trial ends on
                                </label>
                                <p className="font-medium">
                                    {new Date(subscription.trialEndsAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>
                        )}

                        {subscription?.status === 'active' && subscription?.subscriptionEndsAt && (
                            <div>
                                <label className="text-sm text-gray-500 dark:text-gray-400">
                                    Renews on
                                </label>
                                <p className="font-medium">
                                    {new Date(subscription.subscriptionEndsAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                            {/* Show Manage button if user has Stripe subscription */}
                            {subscription?.hasStripeSubscription && (
                                <button
                                    type="button"
                                    onClick={handleManageSubscription}
                                    disabled={isSubscriptionLoading}
                                    className="px-4 py-2 bg-[#F97066] hover:bg-[#E85D52] disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                                >
                                    {isSubscriptionLoading ? 'Loading...' : 'Manage Subscription'}
                                </button>
                            )}

                            {/* Show Upgrade button for Explorer users or those without Stripe subscription */}
                            {(subscription?.plan === 'explorer' || !subscription?.hasStripeSubscription) && (
                                <button
                                    type="button"
                                    onClick={() => handleUpgrade('monthly')}
                                    disabled={isSubscriptionLoading}
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                                >
                                    {isSubscriptionLoading ? 'Loading...' : 'Upgrade to Trailblazer'}
                                </button>
                            )}
                        </div>

                        {/* Explorer plan info */}
                        {subscription?.plan === 'explorer' && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Explorer plan includes 5 Carlo conversations per month. Upgrade to Trailblazer for unlimited conversations.
                            </p>
                        )}
                    </div>
                </Card>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
                <Button
                    variant="solid"
                    onClick={handleSave}
                    disabled={isPending || !hasChanges()}
                    loading={isPending}
                >
                    Save Profile
                </Button>
                {saveStatus === 'success' && (
                    <span className="text-sm text-green-600 dark:text-green-400">
                        Profile saved successfully!
                    </span>
                )}
                {saveStatus === 'error' && (
                    <span className="text-sm text-red-600 dark:text-red-400">
                        Failed to save. Please try again.
                    </span>
                )}
            </div>
        </div>
    )
}

export default ProfileForm
