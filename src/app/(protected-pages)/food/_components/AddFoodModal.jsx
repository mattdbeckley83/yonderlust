'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import CreatableSelect from 'react-select/creatable'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import { PiMagicWand, PiLink } from 'react-icons/pi'
import { addItem } from '@/server/actions/items/addItem'
import { extractFromUrl } from '@/server/actions/items/extractFromUrl'

const weightUnitOptions = [
    { value: 'oz', label: 'oz' },
    { value: 'lb', label: 'lb' },
    { value: 'g', label: 'g' },
    { value: 'kg', label: 'kg' },
]

const loadingMessages = [
    'Checking the nutrition label...',
    'Calculating calories...',
    'Reading the ingredients list...',
    'Weighing the options...',
    'Consulting the trail menu...',
    'Measuring portion sizes...',
    'Cross-referencing with meal plans...',
    'Almost ready to eat...',
]

const AddFoodModal = ({ isOpen, onClose, categories = [], foodTypeId }) => {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState(null)
    const [productUrl, setProductUrl] = useState('')
    const [isExtracting, setIsExtracting] = useState(false)
    const [extractionWarning, setExtractionWarning] = useState(null)
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0])
    const messageIntervalRef = useRef(null)
    const [formState, setFormState] = useState({
        name: '',
        brand: '',
        category_id: null,
        new_category_name: '',
        weight: '',
        weight_unit: 'oz',
        description: '',
        product_url: '',
        calories: '',
    })

    useEffect(() => {
        if (isExtracting) {
            let messageIndex = 0
            setLoadingMessage(loadingMessages[0])
            messageIntervalRef.current = setInterval(() => {
                messageIndex = (messageIndex + 1) % loadingMessages.length
                setLoadingMessage(loadingMessages[messageIndex])
            }, 2000)
        } else {
            if (messageIntervalRef.current) {
                clearInterval(messageIntervalRef.current)
                messageIntervalRef.current = null
            }
        }
        return () => {
            if (messageIntervalRef.current) {
                clearInterval(messageIntervalRef.current)
            }
        }
    }, [isExtracting])

    const categoryOptions = categories.map((cat) => ({
        value: cat.id,
        label: cat.name,
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

    const handleAutoFill = async () => {
        if (!productUrl.trim()) {
            setError('Please enter a product URL')
            return
        }

        setError(null)
        setExtractionWarning(null)
        setIsExtracting(true)

        try {
            const result = await extractFromUrl(productUrl)

            if (result.error) {
                setError(result.error)
                return
            }

            if (result.success && result.data) {
                const data = result.data

                if (data.confidence < 0.5) {
                    setExtractionWarning('Low confidence in extracted data. Please verify all fields.')
                } else if (data.confidence < 0.7) {
                    setExtractionWarning('Some fields may need verification.')
                }

                let categoryId = null
                let newCategoryName = ''
                if (data.category) {
                    const matchingCategory = categories.find(
                        (cat) => cat.name.toLowerCase() === data.category.toLowerCase()
                    )
                    if (matchingCategory) {
                        categoryId = matchingCategory.id
                    } else {
                        newCategoryName = data.category
                    }
                }

                setFormState((prev) => ({
                    ...prev,
                    name: data.name || prev.name,
                    brand: data.brand || prev.brand,
                    category_id: categoryId,
                    new_category_name: newCategoryName,
                    weight: data.weight !== null ? String(data.weight) : prev.weight,
                    weight_unit: data.weight_unit || prev.weight_unit,
                    description: data.description || prev.description,
                    product_url: data.product_url || productUrl,
                    calories: data.calories !== null ? String(data.calories) : prev.calories,
                }))
            }
        } catch (err) {
            console.error('Auto-fill error:', err)
            setError('Failed to extract product details. Please fill in the form manually.')
        } finally {
            setIsExtracting(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        if (!foodTypeId) {
            setError('Food type not configured')
            return
        }

        const formData = new FormData()
        formData.set('name', formState.name)
        formData.set('item_type_id', foodTypeId)
        formData.set('brand', formState.brand)
        formData.set('category_id', formState.category_id || '')
        formData.set('new_category_name', formState.new_category_name)
        formData.set('weight', formState.weight)
        formData.set('weight_unit', formState.weight_unit)
        formData.set('description', formState.description)
        formData.set('product_url', formState.product_url)
        formData.set('calories', formState.calories)

        startTransition(async () => {
            const result = await addItem(formData)
            if (result.error) {
                setError(result.error)
            } else {
                setProductUrl('')
                setExtractionWarning(null)
                setFormState({
                    name: '',
                    brand: '',
                    category_id: null,
                    new_category_name: '',
                    weight: '',
                    weight_unit: 'oz',
                    description: '',
                    product_url: '',
                    calories: '',
                })
                onClose()
            }
        })
    }

    const handleClose = () => {
        setError(null)
        setProductUrl('')
        setExtractionWarning(null)
        setFormState({
            name: '',
            brand: '',
            category_id: null,
            new_category_name: '',
            weight: '',
            weight_unit: 'oz',
            description: '',
            product_url: '',
            calories: '',
        })
        onClose()
    }

    return (
        <Dialog isOpen={isOpen} onClose={handleClose} width={520}>
            <h4 className="text-lg font-semibold mb-3">Add Food</h4>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-3">
                    {/* URL Smart-Fill Section */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Input
                                    placeholder="Paste product URL to auto-fill..."
                                    value={productUrl}
                                    onChange={(e) => setProductUrl(e.target.value)}
                                    disabled={isExtracting}
                                    size="sm"
                                    prefix={<PiLink className="text-gray-400" />}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="solid"
                                size="sm"
                                onClick={handleAutoFill}
                                disabled={isExtracting || !productUrl.trim()}
                                icon={isExtracting ? <Spinner size={16} /> : <PiMagicWand />}
                            >
                                {isExtracting ? '' : 'Fill'}
                            </Button>
                        </div>
                        {isExtracting && (
                            <div className="mt-2 text-sm text-primary-600 dark:text-primary-400 flex items-center gap-2 animate-pulse">
                                <span>{loadingMessage}</span>
                            </div>
                        )}
                    </div>

                    {extractionWarning && (
                        <Alert type="warning" showIcon className="py-2">
                            {extractionWarning}
                        </Alert>
                    )}

                    {/* Name */}
                    <div>
                        <label className="text-sm font-medium mb-1 block">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="Food name"
                            value={formState.name}
                            onChange={handleInputChange('name')}
                            required
                            size="sm"
                        />
                    </div>

                    {/* Brand */}
                    <div>
                        <label className="text-sm font-medium mb-1 block">Brand</label>
                        <Input
                            placeholder="Brand"
                            value={formState.brand}
                            onChange={handleInputChange('brand')}
                            size="sm"
                        />
                    </div>

                    {/* Category + Weight + Unit */}
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

                    {/* Calories */}
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

                    {/* Description */}
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
                            Add Food
                        </Button>
                    </div>
                </div>
            </form>
        </Dialog>
    )
}

export default AddFoodModal
