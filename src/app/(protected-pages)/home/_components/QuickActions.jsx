'use client'

import Card from '@/components/ui/Card'
import Link from 'next/link'

const ActionIcon = ({ src, alt }) => (
    <img
        src={src}
        alt={alt}
        className="w-5 h-5 dark:invert"
    />
)

export default function QuickActions() {
    const actions = [
        {
            label: 'Add Gear',
            description: 'Add new items to your gear list',
            href: '/gear?action=add',
            iconSrc: '/img/logo/backpack.png',
            iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',
        },
        {
            label: 'Plan a Trip',
            description: 'Create a new trip and pack your gear',
            href: '/trips?action=add',
            iconSrc: '/img/logo/trips.png',
            iconBg: 'bg-green-100 dark:bg-green-900/50',
        },
        {
            label: 'Chat with Carlo',
            description: 'Get personalized gear recommendations',
            href: '/carlo',
            iconSrc: '/img/logo/carlo.png',
            iconBg: 'bg-purple-100 dark:bg-purple-900/50',
        },
    ]

    return (
        <Card>
            <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {actions.map((action) => (
                        <Link key={action.label} href={action.href} className="group">
                            <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                <div
                                    className={`flex-shrink-0 w-10 h-10 rounded-lg ${action.iconBg} flex items-center justify-center`}
                                >
                                    <ActionIcon src={action.iconSrc} alt={action.label} />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {action.label}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {action.description}
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
