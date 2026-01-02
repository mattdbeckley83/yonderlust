import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ConversationList from './_components/ConversationList'
import ChatInterface from './_components/ChatInterface'

export const metadata = {
    title: 'Carlo - AI Assistant | Yonderlust',
}

async function getConversations(userId) {
    const { data: conversations, error } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('Error fetching conversations:', error)
        return []
    }

    return conversations || []
}

async function getItems(userId) {
    const { data: items, error } = await supabaseAdmin
        .from('items')
        .select('id, name, brand, weight, weight_unit, category_id, item_type_id, calories')
        .eq('user_id', userId)
        .order('name')

    if (error) {
        console.error('Error fetching items:', error)
        return []
    }

    return items || []
}

async function getTrips(userId) {
    const { data: trips, error } = await supabaseAdmin
        .from('trips')
        .select('id, name, start_date, end_date, notes, activity_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching trips:', error)
        return []
    }

    return trips || []
}

async function getTripItems(userId) {
    // Get all trip_items for user's trips, grouped by trip
    const { data: tripItems, error } = await supabaseAdmin
        .from('trip_items')
        .select('trip_id, item_id, trips!inner(user_id)')
        .eq('trips.user_id', userId)

    if (error) {
        console.error('Error fetching trip items:', error)
        return {}
    }

    // Group by trip_id
    const grouped = {}
    tripItems?.forEach((ti) => {
        if (!grouped[ti.trip_id]) {
            grouped[ti.trip_id] = []
        }
        grouped[ti.trip_id].push(ti.item_id)
    })

    return grouped
}

async function getCategories(userId) {
    const { data: categories, error } = await supabaseAdmin
        .from('categories')
        .select('id, name, color')
        .eq('user_id', userId)
        .order('name')

    if (error) {
        console.error('Error fetching categories:', error)
        return []
    }

    return categories || []
}

async function getActivities() {
    const { data: activities, error } = await supabaseAdmin
        .from('activities')
        .select('id, name, description')
        .order('name')

    if (error) {
        console.error('Error fetching activities:', error)
        return []
    }

    return activities || []
}

async function getItemTypes() {
    const { data: itemTypes, error } = await supabaseAdmin
        .from('item_types')
        .select('id, name')

    if (error) {
        console.error('Error fetching item types:', error)
        return {}
    }

    // Return as a map: { gear: id, food: id }
    const typeMap = {}
    itemTypes?.forEach((t) => {
        typeMap[t.name] = t.id
    })
    return typeMap
}

async function getUserActivities(userId) {
    const { data: userActivities, error } = await supabaseAdmin
        .from('user_activities')
        .select('activity_id, activities(name)')
        .eq('user_id', userId)

    if (error) {
        console.error('Error fetching user activities:', error)
        return []
    }

    // Extract activity names
    return userActivities?.map((ua) => ua.activities?.name).filter(Boolean) || []
}

export default async function CarloPage({ searchParams }) {
    const { userId } = await auth()

    const [conversations, items, trips, tripItems, categories, activities, userActivityNames, itemTypes] = await Promise.all([
        getConversations(userId),
        getItems(userId),
        getTrips(userId),
        getTripItems(userId),
        getCategories(userId),
        getActivities(),
        getUserActivities(userId),
        getItemTypes(),
    ])

    const params = await searchParams
    const activeConversationId = params?.id || null

    return (
        <div className="flex flex-col h-[calc(100vh-120px)]">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Carlo</h1>
                <p className="text-gray-500 mt-1">
                    Your AI backpacking advisor - get personalized gear and trip recommendations
                </p>
            </div>
            <div className="flex flex-1 gap-4 min-h-0">
                <div className="w-80 flex-shrink-0">
                    <ConversationList
                        conversations={conversations}
                        activeConversationId={activeConversationId}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <ChatInterface
                        conversationId={activeConversationId}
                        items={items}
                        trips={trips}
                        tripItems={tripItems}
                        categories={categories}
                        activities={activities}
                        userActivityNames={userActivityNames}
                        itemTypes={itemTypes}
                    />
                </div>
            </div>
        </div>
    )
}
