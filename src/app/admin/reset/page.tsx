'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminResetPage() {
  const router = useRouter()

  useEffect(() => {
    // Clear all admin-related cookies
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax'
    
    // Clear localStorage
    localStorage.clear()
    
    // Clear sessionStorage
    sessionStorage.clear()
    
    console.log('🗑️ Admin-Cookies und Storage geleert')
    
    // Redirect to admin login after a short delay
    setTimeout(() => {
      router.push('/admin')
    }, 1000)
  }, [router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700 text-center">
        <div className="text-3xl mb-4">🔄</div>
        <h1 className="text-xl font-bold text-white mb-4">Admin-Session wird zurückgesetzt...</h1>
        <p className="text-gray-400 mb-4">Cookies und Cache werden geleert.</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-400 mx-auto"></div>
      </div>
    </div>
  )
}
