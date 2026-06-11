import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchCampuses, fetchSubCampuses } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

const CampusContext = createContext(undefined)

export function CampusProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [campuses, setCampuses] = useState([])
  const [subCampuses, setSubCampuses] = useState([]) // all sub-campuses
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const [c, sc] = await Promise.all([fetchCampuses(), fetchSubCampuses()])
      setCampuses(Array.isArray(c) ? c : [])
      setSubCampuses(Array.isArray(sc) ? sc : [])
    } catch {
      // silently fail — forms just show empty dropdowns
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { reload() }, [reload])

  /**
   * Get sub-campuses that belong to a specific campus _id
   */
  const getSubCampusesFor = (campusId) =>
    subCampuses.filter((sc) => {
      const id = sc.campus?._id || sc.campus
      return String(id) === String(campusId)
    })

  return (
    <CampusContext.Provider value={{ campuses, subCampuses, loading, reload, getSubCampusesFor }}>
      {children}
    </CampusContext.Provider>
  )
}

export function useCampuses() {
  const ctx = useContext(CampusContext)
  if (!ctx) throw new Error('useCampuses must be used within CampusProvider')
  return ctx
}
