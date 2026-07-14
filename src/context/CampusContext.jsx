import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fetchCampuses, fetchSubCampuses } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

const CampusContext = createContext(undefined)

export function CampusProvider({ children }) {
  const { isAuthenticated, region, isSuperAdmin } = useAuth()
  const [campuses, setCampuses] = useState([])
  const [subCampuses, setSubCampuses] = useState([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      // Pass active region for super_admin so backend returns the right campuses
      const params = isSuperAdmin && region ? { region } : undefined
      const [c, sc] = await Promise.all([fetchCampuses(params), fetchSubCampuses()])
      setCampuses(Array.isArray(c) ? c : [])
      setSubCampuses(Array.isArray(sc) ? sc : [])
    } catch {
      // silently fail — forms just show empty dropdowns
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, region, isSuperAdmin])

  // Reload campuses whenever region changes (super_admin switching profiles)
  useEffect(() => { reload() }, [reload, region])

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
