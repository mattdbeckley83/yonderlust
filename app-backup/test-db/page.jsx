'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestDBPage() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchActivities() {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('*')
          .order('name')

        if (error) throw error
        setActivities(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      <p className="mb-4">Successfully connected to Supabase!</p>
      <h2 className="text-xl font-semibold mb-2">Activities:</h2>
      <ul className="list-disc pl-6">
        {activities.map((activity) => (
          <li key={activity.id}>
            {activity.name} - {activity.description}
          </li>
        ))}
      </ul>
    </div>
  )
}
