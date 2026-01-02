import { getProfile } from '@/server/actions/profile/getProfile'
import ProfileForm from './_components/ProfileForm'

export const metadata = {
    title: 'Profile | Yonderlust',
}

export default async function ProfilePage() {
    const result = await getProfile()

    if (result.error) {
        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Profile</h1>
                </div>
                <div className="text-red-500">
                    Error loading profile: {result.error}
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Profile</h1>
                <p className="text-gray-500 mt-1">
                    Manage your account settings and activity preferences
                </p>
            </div>
            <ProfileForm
                user={result.user}
                subscription={result.subscription}
                activities={result.activities}
                selectedActivityIds={result.selectedActivityIds}
                activityNotes={result.activityNotes}
            />
        </div>
    )
}
