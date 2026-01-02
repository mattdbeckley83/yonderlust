'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import CreatableSelect from 'react-select/creatable'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Table from '@/components/ui/Table'
import Alert from '@/components/ui/Alert'
import { PiUploadSimple, PiTrash, PiCaretDown, PiCaretUp } from 'react-icons/pi'
import { importLighterpackItems } from '@/server/actions/import/importLighterpackItems'

const { Tr, Th, Td, THead, TBody } = Table

const unitOptions = [
    { value: 'oz', label: 'oz' },
    { value: 'lb', label: 'lb' },
    { value: 'g', label: 'g' },
    { value: 'kg', label: 'kg' },
]

// Normalize weight unit variations to standard abbreviations
const normalizeUnit = (unit) => {
    if (!unit) return 'oz' // Default to oz if no unit provided
    const lower = unit.toLowerCase().trim()
    switch (lower) {
        case 'pound':
        case 'pounds':
        case 'lb':
        case 'lbs':
            return 'lb'
        case 'ounce':
        case 'ounces':
        case 'oz':
            return 'oz'
        case 'gram':
        case 'grams':
        case 'g':
            return 'g'
        case 'kilogram':
        case 'kilograms':
        case 'kg':
            return 'kg'
        default:
            return 'oz' // Default to oz for unrecognized units
    }
}

// Parse CSV row with unit normalization
const parseRow = (row) => {
    const name = row['Item Name']

    if (!name) {
        return null // Skip rows without a name
    }

    return {
        name: name,
        category: row['Category'] || '',
        description: row['desc'] || '',
        weight: row['weight'] || '',
        weightUnit: normalizeUnit(row['unit']),
        productUrl: row['url'] || '',
        selected: true,
    }
}

const ImportUploader = ({ gearTypeId, existingCategories }) => {
    const router = useRouter()
    const [file, setFile] = useState(null)
    const [items, setItems] = useState([])
    const [parseError, setParseError] = useState(null)
    const [isPending, startTransition] = useTransition()
    const [importResult, setImportResult] = useState(null)
    const [showMoreFields, setShowMoreFields] = useState(false)

    // Build category options from existing + new from items
    const categoryOptions = useMemo(() => {
        const existingNames = new Set(existingCategories.map((c) => c.name.toLowerCase()))
        const newFromItems = [...new Set(
            items
                .filter((item) => item.category && !existingNames.has(item.category.toLowerCase()))
                .map((item) => item.category)
        )]

        const options = [
            { value: '', label: 'No category' },
            ...existingCategories.map((c) => ({ value: c.name, label: c.name })),
            ...newFromItems.map((name) => ({ value: name, label: `${name} (new)` })),
        ]

        return options
    }, [existingCategories, items])

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        setFile(selectedFile)
        setParseError(null)
        setImportResult(null)

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setParseError(`CSV parsing error: ${results.errors[0].message}`)
                    setItems([])
                    return
                }

                const parsedItems = results.data
                    .map((row, index) => {
                        const item = parseRow(row)
                        if (item) {
                            item.id = index
                        }
                        return item
                    })
                    .filter(Boolean)

                if (parsedItems.length === 0) {
                    setParseError('No valid items found in CSV. Make sure it has an "Item Name" column.')
                    setItems([])
                    return
                }

                setItems(parsedItems)
            },
            error: (error) => {
                setParseError(`Failed to read file: ${error.message}`)
                setItems([])
            },
        })
    }

    const updateItem = (id, field, value) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        )
    }

    const toggleItem = (id) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, selected: !item.selected } : item
            )
        )
    }

    const removeItem = (id) => {
        setItems((prev) => prev.filter((item) => item.id !== id))
    }

    const toggleAll = (checked) => {
        setItems((prev) => prev.map((item) => ({ ...item, selected: checked })))
    }

    const handleCategoryChange = (id, option) => {
        updateItem(id, 'category', option?.value || '')
    }

    const handleCategoryCreate = (id, inputValue) => {
        updateItem(id, 'category', inputValue)
    }

    const selectedItems = items.filter((item) => item.selected)
    const allSelected = items.length > 0 && selectedItems.length === items.length
    const validSelectedItems = selectedItems.filter((item) => item.name.trim() && item.weightUnit)

    // Check for items missing required fields
    const itemsMissingUnit = selectedItems.filter((item) => item.name.trim() && !item.weightUnit)

    const handleImport = () => {
        if (validSelectedItems.length === 0) return

        startTransition(async () => {
            const itemsToImport = validSelectedItems.map((item) => ({
                name: item.name.trim(),
                category: item.category.trim() || null,
                description: item.description.trim() || null,
                weight: item.weight ? parseFloat(item.weight) : null,
                weightUnit: item.weightUnit,
                productUrl: item.productUrl.trim() || null,
            }))

            const result = await importLighterpackItems(itemsToImport, gearTypeId)

            if (result.success) {
                setImportResult({
                    type: 'success',
                    message: `Successfully imported ${result.count} items!`,
                })
                setTimeout(() => {
                    router.push('/gear')
                }, 1500)
            } else {
                setImportResult({
                    type: 'error',
                    message: result.error || 'Failed to import items',
                })
            }
        })
    }

    // Get unique new categories
    const newCategories = [...new Set(
        items
            .filter((item) => item.category.trim())
            .map((item) => item.category.trim())
    )].filter((cat) => !existingCategories.some((ec) => ec.name.toLowerCase() === cat.toLowerCase()))

    return (
        <div className="flex flex-col gap-6">
            {/* Instructions */}
            <Card>
                <div className="flex flex-col gap-4">
                    <h2 className="text-lg font-semibold">How to Export from LighterPack</h2>
                    <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                        <li>Go to your LighterPack list</li>
                        <li>Click the menu icon (three dots) in the top right</li>
                        <li>Select "Export CSV"</li>
                        <li>Upload the downloaded file below</li>
                    </ol>
                </div>
            </Card>

            {/* File Upload */}
            <Card>
                <div className="flex flex-col gap-4">
                    <h2 className="text-lg font-semibold">Upload CSV File</h2>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary-dark transition-colors">
                            <PiUploadSimple size={20} />
                            <span>Choose File</span>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                        {file && (
                            <span className="text-gray-600 dark:text-gray-400">
                                {file.name}
                            </span>
                        )}
                    </div>
                    {parseError && (
                        <Alert type="danger" showIcon>
                            {parseError}
                        </Alert>
                    )}
                </div>
            </Card>

            {/* Import Result */}
            {importResult && (
                <Alert type={importResult.type === 'success' ? 'success' : 'danger'} showIcon>
                    {importResult.message}
                </Alert>
            )}

            {/* Preview Table */}
            {items.length > 0 && (
                <Card>
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h2 className="text-lg font-semibold">Edit & Import</h2>
                                <p className="text-sm text-gray-500">
                                    {validSelectedItems.length} of {items.length} items ready to import
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowMoreFields(!showMoreFields)}
                                    className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                >
                                    {showMoreFields ? <PiCaretUp /> : <PiCaretDown />}
                                    {showMoreFields ? 'Hide' : 'Show'} Description & URL
                                </button>
                                <Button
                                    variant="solid"
                                    onClick={handleImport}
                                    disabled={isPending || validSelectedItems.length === 0}
                                    loading={isPending}
                                >
                                    Import {validSelectedItems.length} Items
                                </Button>
                            </div>
                        </div>

                        {itemsMissingUnit.length > 0 && (
                            <Alert type="warning" showIcon>
                                {itemsMissingUnit.length} {itemsMissingUnit.length === 1 ? 'item needs a' : 'items need a'} weight unit selected before importing.
                            </Alert>
                        )}

                        {newCategories.length > 0 && (
                            <Alert type="info" showIcon>
                                {newCategories.length} new {newCategories.length === 1 ? 'category' : 'categories'} will be created: {newCategories.join(', ')}
                            </Alert>
                        )}

                        <div className="overflow-x-auto">
                            <Table>
                                <THead>
                                    <Tr>
                                        <Th className="w-12">
                                            <Checkbox
                                                checked={allSelected}
                                                onChange={toggleAll}
                                            />
                                        </Th>
                                        <Th className="min-w-[200px]">Name *</Th>
                                        <Th className="min-w-[180px]">Category</Th>
                                        <Th className="min-w-[160px]">Weight *</Th>
                                        {showMoreFields && (
                                            <>
                                                <Th className="min-w-[200px]">Description</Th>
                                                <Th className="min-w-[200px]">Product URL</Th>
                                            </>
                                        )}
                                        <Th className="w-12"></Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {items.map((item) => (
                                        <Tr
                                            key={item.id}
                                            className={!item.selected ? 'opacity-50' : ''}
                                        >
                                            <Td>
                                                <Checkbox
                                                    checked={item.selected}
                                                    onChange={() => toggleItem(item.id)}
                                                />
                                            </Td>
                                            <Td>
                                                <Input
                                                    size="sm"
                                                    value={item.name}
                                                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                                    placeholder="Item name"
                                                    invalid={item.selected && !item.name.trim()}
                                                />
                                            </Td>
                                            <Td>
                                                <Select
                                                    size="sm"
                                                    componentAs={CreatableSelect}
                                                    options={categoryOptions}
                                                    value={categoryOptions.find((o) => o.value === item.category) || categoryOptions[0]}
                                                    onChange={(option) => handleCategoryChange(item.id, option)}
                                                    onCreateOption={(inputValue) => handleCategoryCreate(item.id, inputValue)}
                                                    isClearable
                                                    placeholder="Select or create..."
                                                    formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
                                                />
                                            </Td>
                                            <Td>
                                                <div className="flex gap-2">
                                                    <Input
                                                        size="sm"
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.weight}
                                                        onChange={(e) => updateItem(item.id, 'weight', e.target.value)}
                                                        placeholder="0"
                                                        className="w-20"
                                                    />
                                                    <Select
                                                        size="sm"
                                                        options={unitOptions}
                                                        value={unitOptions.find((o) => o.value === item.weightUnit) || null}
                                                        onChange={(option) => updateItem(item.id, 'weightUnit', option?.value || '')}
                                                        isSearchable={false}
                                                        placeholder="Unit"
                                                        invalid={item.selected && !item.weightUnit}
                                                        className="w-24"
                                                    />
                                                </div>
                                            </Td>
                                            {showMoreFields && (
                                                <>
                                                    <Td>
                                                        <Input
                                                            size="sm"
                                                            value={item.description}
                                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                            placeholder="Description"
                                                        />
                                                    </Td>
                                                    <Td>
                                                        <Input
                                                            size="sm"
                                                            value={item.productUrl}
                                                            onChange={(e) => updateItem(item.id, 'productUrl', e.target.value)}
                                                            placeholder="https://..."
                                                        />
                                                    </Td>
                                                </>
                                            )}
                                            <Td>
                                                <Button
                                                    size="xs"
                                                    variant="plain"
                                                    icon={<PiTrash />}
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => removeItem(item.id)}
                                                />
                                            </Td>
                                        </Tr>
                                    ))}
                                </TBody>
                            </Table>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}

export default ImportUploader
