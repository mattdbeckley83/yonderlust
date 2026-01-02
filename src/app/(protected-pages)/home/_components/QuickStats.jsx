'use client'

import Card from '@/components/ui/Card'
import { PiBackpack, PiMapTrifold } from 'react-icons/pi'
import Link from 'next/link'

export default function QuickStats({ itemsCount, tripsCount }) {
    return (
        <Card className="h-full">
            <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quick Stats
                </h3>
                <div className="flex flex-col gap-3">
                    <Link href="/gear" className="group">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                                <PiBackpack className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {itemsCount}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Items in your gear list
                                </p>
                            </div>
                        </div>
                    </Link>
                    <Link href="/trips" className="group">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                <PiMapTrifold className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {tripsCount}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Trips planned
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </Card>
    )
}
