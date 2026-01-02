'use client'

import { useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { useClerk } from '@clerk/nextjs'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import { PiUserDuotone, PiUserCircle, PiSignOut, PiCaretUp, PiCaretDown, PiEnvelope } from 'react-icons/pi'

const STORAGE_KEY = 'userSectionExpanded'

const SideNavUserSection = ({ collapsed = false, onItemClick }) => {
    // Initialize state directly from localStorage to avoid flash
    const [isExpanded, setIsExpanded] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                return localStorage.getItem(STORAGE_KEY) === 'true'
            } catch (e) {
                // localStorage not available
            }
        }
        return false
    })
    const { session, isLoaded } = useCurrentSession()
    const { signOut } = useClerk()

    const handleSignOut = async () => {
        // Clear localStorage on sign out
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch (e) {
            // localStorage not available
        }
        await signOut({ redirectUrl: '/sign-in' })
    }

    const handleToggle = () => {
        if (!collapsed) {
            const newExpanded = !isExpanded
            setIsExpanded(newExpanded)
            // Persist to localStorage
            try {
                localStorage.setItem(STORAGE_KEY, String(newExpanded))
            } catch (e) {
                // localStorage not available
            }
        }
    }

    // Only collapse for mobile nav (when onItemClick callback is provided)
    const handleItemClick = () => {
        if (onItemClick) {
            setIsExpanded(false)
            onItemClick()
        }
    }

    const avatarProps = {
        ...(isLoaded && session?.user?.image
            ? { src: session?.user?.image }
            : { icon: <PiUserDuotone /> }),
    }

    const firstName = isLoaded ? (session?.user?.name?.split(' ')[0] || 'User') : ''

    if (collapsed) {
        return (
            <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-center">
                    <Avatar size={32} {...avatarProps} />
                </div>
            </div>
        )
    }

    return (
        <div className="border-t border-gray-200 dark:border-gray-700">
            {/* User row - click to expand */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <Avatar size={32} {...avatarProps} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                        {firstName}
                    </span>
                </div>
                <span className="text-gray-400 dark:text-gray-500">
                    {isExpanded ? <PiCaretUp size={16} /> : <PiCaretDown size={16} />}
                </span>
            </button>

            {/* Expanded menu */}
            {isExpanded && (
                <div className="pb-2 px-2">
                    <Link
                        href="/profile"
                        onClick={handleItemClick}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <PiUserCircle size={18} />
                        <span>Profile</span>
                    </Link>
                    <Link
                        href="/contact"
                        onClick={handleItemClick}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <PiEnvelope size={18} />
                        <span>Contact Us</span>
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <PiSignOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            )}
        </div>
    )
}

export default SideNavUserSection
