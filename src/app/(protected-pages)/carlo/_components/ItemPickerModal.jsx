'use client'

import { useState, useMemo } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Checkbox from '@/components/ui/Checkbox'
import { PiMagnifyingGlass } from 'react-icons/pi'

export default function ItemPickerModal({
    isOpen,
    onClose,
    items = [],
    categories = [],
    selectedIds = [],
    onSave,
    itemType = 'gear', // 'gear' or 'food'
}) {
    const [searchQuery, setSearchQuery] = useState('')
    const [localSelectedIds, setLocalSelectedIds] = useState(selectedIds)
    const [groupBy, setGroupBy] = useState('category') // 'category' or 'type'

    // Reset local state when modal opens
    useState(() => {
        if (isOpen) {
            setLocalSelectedIds(selectedIds)
            setSearchQuery('')
        }
    }, [isOpen, selectedIds])

    // Create category map
    const categoryMap = useMemo(() => {
        return categories.reduce((acc, cat) => {
            acc[cat.id] = cat
            return acc
        }, {})
    }, [categories])

    // Filter and group items
    const filteredItems = useMemo(() => {
        let result = items
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = items.filter(
                (item) =>
                    item.name?.toLowerCase().includes(query) ||
                    item.brand?.toLowerCase().includes(query) ||
                    categoryMap[item.category_id]?.name?.toLowerCase().includes(query)
            )
        }
        return result
    }, [items, searchQuery, categoryMap])

    // Group items by category
    const groupedItems = useMemo(() => {
        const groups = {}
        filteredItems.forEach((item) => {
            const category = categoryMap[item.category_id]
            const groupKey = category?.name || 'Uncategorized'
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    name: groupKey,
                    color: category?.color || '#6b7280',
                    items: [],
                }
            }
            groups[groupKey].items.push(item)
        })
        // Sort groups alphabetically, but put Uncategorized last
        return Object.values(groups).sort((a, b) => {
            if (a.name === 'Uncategorized') return 1
            if (b.name === 'Uncategorized') return -1
            return a.name.localeCompare(b.name)
        })
    }, [filteredItems, categoryMap])

    const handleToggleItem = (itemId) => {
        setLocalSelectedIds((prev) =>
            prev.includes(itemId)
                ? prev.filter((id) => id !== itemId)
                : [...prev, itemId]
        )
    }

    const handleSelectAll = () => {
        setLocalSelectedIds(filteredItems.map((item) => item.id))
    }

    const handleClearAll = () => {
        setLocalSelectedIds([])
    }

    const handleSave = () => {
        onSave(localSelectedIds)
        onClose()
    }

    const handleClose = () => {
        setLocalSelectedIds(selectedIds) // Reset to original
        onClose()
    }

    const selectedCount = localSelectedIds.length
    const typeLabel = itemType === 'food' ? 'Food' : 'Gear'
    const typeLabelLower = itemType === 'food' ? 'food' : 'gear'

    return (
        <Dialog isOpen={isOpen} onClose={handleClose} width={600}>
            <div className="flex flex-col h-[70vh] max-h-[600px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">Select {typeLabel}</h4>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedCount} selected
                    </span>
                </div>

                {/* Search */}
                <div className="mb-4">
                    <Input
                        placeholder={`Search ${typeLabelLower}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        prefix={<PiMagnifyingGlass className="text-gray-400" />}
                        size="sm"
                    />
                </div>

                {/* Select All / Clear All */}
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={handleSelectAll}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        Select All ({filteredItems.length})
                    </button>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <button
                        onClick={handleClearAll}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
                    >
                        Clear All
                    </button>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    {filteredItems.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            {items.length === 0
                                ? `No ${typeLabelLower} in your inventory`
                                : `No ${typeLabelLower} match your search`}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {groupedItems.map((group) => (
                                <div key={group.name}>
                                    {/* Category Header */}
                                    <div className="sticky top-0 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: group.color }}
                                            />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {group.name}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                ({group.items.length})
                                            </span>
                                        </div>
                                    </div>
                                    {/* Items in Category */}
                                    {group.items.map((item) => (
                                        <label
                                            key={item.id}
                                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                        >
                                            <Checkbox
                                                checked={localSelectedIds.includes(item.id)}
                                                onChange={() => handleToggleItem(item.id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {item.name}
                                                </div>
                                                {item.brand && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {item.brand}
                                                    </div>
                                                )}
                                            </div>
                                            {item.weight && (
                                                <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                                                    {item.weight} {item.weight_unit}
                                                </div>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="plain" size="sm" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button variant="solid" size="sm" onClick={handleSave}>
                        Save ({selectedCount} {typeLabelLower})
                    </Button>
                </div>
            </div>
        </Dialog>
    )
}
