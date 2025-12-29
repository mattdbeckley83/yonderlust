'use client'

import { useState, useEffect, useTransition } from 'react'
import CreatableSelect from 'react-select/creatable'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { PiTrash, PiWarning } from 'react-icons/pi'
import { updateItem } from '@/server/actions/items/updateItem'
import { deleteItem, getItemTripCount } from '@/server/actions/items/deleteItem'

const weightUnitOptions = [
    { value: 'oz', label: 'oz' },
    { value: 'lb', label: 'lb' },
    { value: 'g', label: 'g' },
    { value: 'kg', label: 'kg' },
]

const EditItemModal = ({ isOpen, onClose, item, categories = [], itemTypes = [] }) => {
    const [isPending, startTransition] = useTransition()
    const [isDeleting, startDeleteTransition] = useTransition()
    const [error, setError] = useState(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [tripCount, setTripCount] = useState(0)
    const [formState, setFormState] = useState({
        name: '',
        item_type_id: null,
        brand: '',
        category_id: null,
        new_category_name: '',
        weight: '',
        weight_unit: 'oz',
        description: '',
        calories: '',
    })

    // Filter out water from item types (water is tracked at trip level)
    const filteredItemTypes = itemTypes.filter(
        (type) => type.name.toLowerCase() !== 'water'
    )

    // Check if selected type is food
    const selectedItemType = itemTypes.find((t) => t.id === formState.item_type_id)
    const isFoodType = selectedItemType?.name?.toLowerCase() === 'food'

    // Populate form when item changes
    useEffect(() => {
        if (item) {
            setFormState({
                name: item.name || '',
                item_type_id: item.item_type_id || null,
                brand: item.brand || '',
                category_id: item.category_id || null,
                new_category_name: '',
                weight: item.weight?.toString() || '',
                weight_unit: item.weight_unit || 'oz',
                description: item.description || '',
                calories: item.calories?.toString() || '',
            })
            setShowDeleteConfirm(false)
            setTripCount(0)
        }
    }, [item])

    // Fetch trip count when delete confirmation is shown
    useEffect(() => {
        if (showDeleteConfirm && item) {
            getItemTripCount(item.id).then(({ count }) => {
                setTripCount(count)
            })
        }
    }, [showDeleteConfirm, item])

    const categoryOptions = categories.map((cat) => ({
        value: cat.id,
        label: cat.name,
    }))

    const itemTypeOptions = filteredItemTypes.map((type) => ({
        value: type.id,
        label: type.name.charAt(0).toUpperCase() + type.name.slice(1),
    }))

    const handleInputChange = (field) => (e) => {
        setFormState((prev) => ({
            ...prev,
            [field]: e.target.value,
        }))
    }

    const handleSelectChange = (field) => (option) => {
        setFormState((prev) => ({
            ...prev,
            [field]: option?.value ?? null,
        }))
    }

    const handleCategoryChange = (option, actionMeta) => {
        if (actionMeta.action === 'create-option') {
            setFormState((prev) => ({
                ...prev,
                category_id: null,
                new_category_name: option.value,
            }))
        } else if (option) {
            setFormState((prev) => ({
                ...prev,
                category_id: option.value,
                new_category_name: '',
            }))
        } else {
            setFormState((prev) => ({
                ...prev,
                category_id: null,
                new_category_name: '',
            }))
        }
    }

    const getCategoryValue = () => {
        if (formState.new_category_name) {
            return { value: formState.new_category_name, label: formState.new_category_name }
        }
        if (formState.category_id) {
            return categoryOptions.find((opt) => opt.value === formState.category_id)
        }
        return null
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        if (!formState.item_type_id) {
            setError('Type is required')
            return
        }

        const formData = new FormData()
        formData.set('item_id', item.id)
        formData.set('name', formState.name)
        formData.set('item_type_id', formState.item_type_id)
        formData.set('brand', formState.brand)
        formData.set('category_id', formState.category_id || '')
        formData.set('new_category_name', formState.new_category_name)
        formData.set('weight', formState.weight)
        formData.set('weight_unit', formState.weight_unit)
        formData.set('description', formState.description)
        if (isFoodType && formState.calories) {
            formData.set('calories', formState.calories)
        } else {
            formData.set('calories', '') // Clear calories if not food type
        }

        startTransition(async () => {
            const result = await updateItem(formData)
            if (result.error) {
                setError(result.error)
            } else {
                onClose()
            }
        })
    }

    const handleClose = () => {
        setError(null)
        setShowDeleteConfirm(false)
        onClose()
    }

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true)
    }

    const handleDeleteConfirm = () => {
        startDeleteTransition(async () => {
            const result = await deleteItem(item.id)
            if (result.error) {
                setError(result.error)
                setShowDeleteConfirm(false)
            } else {
                handleClose()
            }
        })
    }

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false)
    }

    if (showDeleteConfirm) {
        return (
            <Dialog isOpen={isOpen} onClose={handleClose} width={400}>
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <PiWarning className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mb-2">Delete Item</h4>
                        <p className="text-gray-600 dark:text-gray-400">
                            Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-gray-100">{item?.name}</span>?
                        </p>
                        {tripCount > 0 && (
                            <p className="text-amber-600 dark:text-amber-400 text-sm mt-2">
                                This item is used in {tripCount} trip{tripCount > 1 ? 's' : ''}. It will be removed from all trips.
                            </p>
                        )}
                    </div>
                    {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                    )}
                    <div className="flex gap-3 w-full">
                        <Button
                            variant="plain"
                            className="flex-1"
                            onClick={handleDeleteCancel}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            className="flex-1 !bg-red-600 hover:!bg-red-700"
                            onClick={handleDeleteConfirm}
                            loading={isDeleting}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Dialog>
        )
    }

    return (
        <Dialog isOpen={isOpen} onClose={handleClose} width={520}>
            <div className="flex justify-between items-start mb-3">
                <h4 className="text-lg font-semibold">Edit Item</h4>
                <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete item"
                >
                    <PiTrash className="w-5 h-5" />
                </button>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-3">
                    {/* Row 1: Name (full width) */}
                    <div>
                        <label className="text-sm font-medium mb-1 block">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="Item name"
                            value={formState.name}
                            onChange={handleInputChange('name')}
                            required
                            size="sm"
                        />
                    </div>

                    {/* Row 2: Brand + Type */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Brand</label>
                            <Input
                                placeholder="Brand"
                                value={formState.brand}
                                onChange={handleInputChange('brand')}
                                size="sm"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">
                                Type <span className="text-red-500">*</span>
                            </label>
                            <Select
                                placeholder="Select..."
                                options={itemTypeOptions}
                                value={itemTypeOptions.find(
                                    (opt) => opt.value === formState.item_type_id
                                )}
                                onChange={handleSelectChange('item_type_id')}
                                size="sm"
                            />
                        </div>
                    </div>

                    {/* Row 3: Category + Weight + Unit */}
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-5">
                            <label className="text-sm font-medium mb-1 block">Category</label>
                            <Select
                                componentAs={CreatableSelect}
                                placeholder="Select or create..."
                                options={categoryOptions}
                                value={getCategoryValue()}
                                onChange={handleCategoryChange}
                                isClearable
                                formatCreateLabel={(inputValue) => `+ "${inputValue}"`}
                                size="sm"
                            />
                        </div>
                        <div className="col-span-4">
                            <label className="text-sm font-medium mb-1 block">Weight</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={formState.weight}
                                onChange={handleInputChange('weight')}
                                step="0.01"
                                min="0"
                                size="sm"
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="text-sm font-medium mb-1 block">Unit</label>
                            <Select
                                options={weightUnitOptions}
                                value={weightUnitOptions.find(
                                    (opt) => opt.value === formState.weight_unit
                                )}
                                onChange={handleSelectChange('weight_unit')}
                                size="sm"
                            />
                        </div>
                    </div>

                    {/* Row 3.5: Calories (only for food) */}
                    {isFoodType && (
                        <div>
                            <label className="text-sm font-medium mb-1 block">Total Calories</label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={formState.calories}
                                onChange={handleInputChange('calories')}
                                min="0"
                                size="sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">Total calories for entire package</p>
                        </div>
                    )}

                    {/* Row 4: Description */}
                    <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <Input
                            textArea
                            placeholder="Optional notes..."
                            value={formState.description}
                            onChange={handleInputChange('description')}
                            rows={2}
                            size="sm"
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm">{error}</div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <Button
                            type="button"
                            variant="plain"
                            size="sm"
                            onClick={handleClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="solid"
                            size="sm"
                            loading={isPending}
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    )
}

export default EditItemModal
