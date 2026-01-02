'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { getCategoryColor } from '@/lib/constants/colors'

export async function importLighterpackItems(items, gearTypeId) {
    const { userId } = await auth()

    if (!userId) {
        return { error: 'Unauthorized' }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return { error: 'No items to import' }
    }

    if (!gearTypeId) {
        return { error: 'Gear type not found' }
    }

    try {
        // Get existing categories for user
        const { data: existingCategories, error: catFetchError } = await supabaseAdmin
            .from('categories')
            .select('id, name')
            .eq('user_id', userId)

        if (catFetchError) {
            console.error('Error fetching categories:', catFetchError)
            return { error: 'Failed to fetch categories' }
        }

        // Build a map of category name (lowercase) to id
        const categoryMap = {}
        existingCategories.forEach((cat) => {
            categoryMap[cat.name.toLowerCase()] = cat.id
        })

        // Find unique categories that need to be created
        const categoriesToCreate = [...new Set(
            items
                .filter((item) => item.category)
                .map((item) => item.category)
        )].filter((catName) => !categoryMap[catName.toLowerCase()])

        // Create new categories
        let categoryCount = existingCategories.length
        for (const categoryName of categoriesToCreate) {
            const color = getCategoryColor(categoryCount)

            const { data: newCategory, error: catCreateError } = await supabaseAdmin
                .from('categories')
                .insert({
                    user_id: userId,
                    name: categoryName,
                    color,
                })
                .select()
                .single()

            if (catCreateError) {
                console.error('Error creating category:', catCreateError)
                // Continue with other categories
            } else {
                categoryMap[categoryName.toLowerCase()] = newCategory.id
                categoryCount++
            }
        }

        // Prepare items for insertion
        const itemsToInsert = items.map((item) => ({
            user_id: userId,
            item_type_id: gearTypeId,
            category_id: item.category ? categoryMap[item.category.toLowerCase()] || null : null,
            name: item.name,
            weight: item.weight,
            weight_unit: item.weightUnit || 'oz',
            description: item.description,
            product_url: item.productUrl,
        }))

        // Insert all items
        const { data: insertedItems, error: insertError } = await supabaseAdmin
            .from('items')
            .insert(itemsToInsert)
            .select()

        if (insertError) {
            console.error('Error inserting items:', insertError)
            return { error: 'Failed to import items' }
        }

        revalidatePath('/gear')
        revalidatePath('/home')
        return { success: true, count: insertedItems.length }
    } catch (error) {
        console.error('Error in importLighterpackItems:', error)
        return { error: 'An unexpected error occurred' }
    }
}
