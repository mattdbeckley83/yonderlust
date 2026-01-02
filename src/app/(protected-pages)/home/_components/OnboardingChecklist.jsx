'use client'

import Card from '@/components/ui/Card'
import Progress from '@/components/ui/Progress'
import { PiCheck, PiBackpack, PiMapTrifold, PiRobot, PiUser } from 'react-icons/pi'
import Link from 'next/link'

export default function OnboardingChecklist({ onboardingStatus }) {
    const checklistItems = [
        {
            id: 'gear',
            label: 'Add your first gear item',
            description: 'Start building your gear inventory',
            completed: onboardingStatus.hasAddedGear,
            href: '/gear?action=add',
            icon: PiBackpack,
        },
        {
            id: 'trip',
            label: 'Create your first trip',
            description: 'Plan a trip and add gear to it',
            completed: onboardingStatus.hasAddedTrip,
            href: '/trips?action=add',
            icon: PiMapTrifold,
        },
        {
            id: 'carlo',
            label: 'Chat with Carlo',
            description: 'Get personalized advice from our AI assistant',
            completed: onboardingStatus.hasUsedCarlo,
            href: '/carlo',
            icon: PiRobot,
        },
        {
            id: 'profile',
            label: 'Complete your profile',
            description: 'Add your name and preferences',
            completed: onboardingStatus.hasCompletedProfile,
            href: '/profile',
            icon: PiUser,
        },
    ]

    const completedCount = checklistItems.filter((item) => item.completed).length
    const progressPercent = Math.round((completedCount / checklistItems.length) * 100)

    return (
        <Card>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Getting Started
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {completedCount} of {checklistItems.length} complete
                    </span>
                </div>

                <Progress
                    percent={progressPercent}
                    size="sm"
                    showInfo={false}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {checklistItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`group ${item.completed ? 'pointer-events-none' : ''}`}
                        >
                            <div
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                                    item.completed
                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                }`}
                            >
                                <div
                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                        item.completed
                                            ? 'bg-green-100 dark:bg-green-900/50'
                                            : 'bg-gray-100 dark:bg-gray-800'
                                    }`}
                                >
                                    {item.completed ? (
                                        <PiCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    ) : (
                                        <item.icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={`font-medium ${
                                            item.completed
                                                ? 'text-green-700 dark:text-green-400 line-through'
                                                : 'text-gray-900 dark:text-white'
                                        }`}
                                    >
                                        {item.label}
                                    </p>
                                    <p
                                        className={`text-sm ${
                                            item.completed
                                                ? 'text-green-600 dark:text-green-500'
                                                : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                    >
                                        {item.completed ? 'Completed!' : item.description}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </Card>
    )
}
