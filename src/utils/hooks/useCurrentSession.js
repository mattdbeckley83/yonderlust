'use client'
import { useUser } from '@clerk/nextjs'

const useCurrentSession = () => {
    const { user, isLoaded, isSignedIn } = useUser()

    // Map Clerk user to session format for backward compatibility
    const session = isSignedIn && user ? {
        user: {
            id: user.id,
            name: user.fullName || user.firstName || 'Anonymous',
            email: user.primaryEmailAddress?.emailAddress,
            image: user.imageUrl,
        }
    } : null

    return {
        session,
        isLoaded,
        isSignedIn,
    }
}

export default useCurrentSession
