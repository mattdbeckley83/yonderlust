import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import FoodList from './_components/FoodList'

export const metadata = {
    title: 'My Food | Yonderlust',
}

async function getFoodTypeId() {
    const { data: itemType, error } = await supabaseAdmin
        .from('item_types')
        .select('id')
        .eq('name', 'food')
        .single()

    if (error) {
        console.error('Error fetching food type:', error)
        return null
    }

    return itemType?.id
}

async function getFoodItems(userId, foodTypeId) {
    if (!foodTypeId) return []

    const { data: items, error } = await supabaseAdmin
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .eq('item_type_id', foodTypeId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching food items:', error)
        return []
    }

    return items || []
}

async function getCategories(userId) {
    const { data: categories, error } = await supabaseAdmin
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('name')

    if (error) {
        console.error('Error fetching categories:', error)
        return []
    }

    return categories || []
}

export default async function FoodPage() {
    const { userId } = await auth()

    const foodTypeId = await getFoodTypeId()
    const [items, categories] = await Promise.all([
        getFoodItems(userId, foodTypeId),
        getCategories(userId),
    ])

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">My Food</h1>
                <p className="text-gray-500 mt-1">
                    Manage your food inventory
                </p>
            </div>
            <FoodList
                items={items}
                categories={categories}
                foodTypeId={foodTypeId}
            />
        </div>
    )
}
