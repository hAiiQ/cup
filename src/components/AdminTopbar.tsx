'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type AdminSection = 'overview' | 'users' | 'teams' | 'wheel' | 'bracket'
export type DashboardView = 'overview' | 'users'

type AdminTopbarProps = {
  active: AdminSection
  onSelectDashboardView?: (view: DashboardView) => void
}

const navItems: Array<{
  id: AdminSection
  label: string
  href: string
  dashboardView?: DashboardView
  color: string
  activeColor: string
}> = [
  {
    id: 'overview',
    label: 'Übersicht',
    href: '/admin/dashboard?view=overview',
    dashboardView: 'overview',
    color: 'bg-slate-700 hover:bg-slate-600',
    activeColor: 'bg-slate-600 ring-slate-300/70',
  },
  {
    id: 'users',
    label: 'User Management',
    href: '/admin/dashboard?view=users',
    dashboardView: 'users',
    color: 'bg-red-700 hover:bg-red-600',
    activeColor: 'bg-red-600 ring-red-300/70',
  },
  {
    id: 'teams',
    label: 'Team Management',
    href: '/admin/teams',
    color: 'bg-emerald-700 hover:bg-emerald-600',
    activeColor: 'bg-emerald-600 ring-emerald-300/70',
  },
  {
    id: 'wheel',
    label: 'Glücksrad',
    href: '/admin/wheel',
    color: 'bg-fuchsia-700 hover:bg-fuchsia-600',
    activeColor: 'bg-fuchsia-600 ring-fuchsia-300/70',
  },
  {
    id: 'bracket',
    label: 'Tournament Bracket',
    href: '/admin/bracket',
    color: 'bg-blue-700 hover:bg-blue-600',
    activeColor: 'bg-blue-600 ring-blue-300/70',
  },
]

export default function AdminTopbar({ active, onSelectDashboardView }: AdminTopbarProps) {
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'include',
    })
    router.push('/admin')
  }

  return (
    <header className="border-b border-white/10 bg-gray-950 text-white">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <nav
          aria-label="Admin Navigation"
          className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:flex sm:flex-wrap"
        >
          {navItems.map((item) => {
            const isActive = active === item.id

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={(event) => {
                  if (item.dashboardView && onSelectDashboardView) {
                    event.preventDefault()
                    onSelectDashboardView(item.dashboardView)
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-12 items-center justify-center rounded-md px-4 py-3 text-center text-sm font-bold text-white transition-colors sm:min-w-36 sm:text-base ${
                  isActive
                    ? `${item.activeColor} ring-2 ring-inset`
                    : item.color
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="min-h-11 rounded-md border border-gray-600 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-400 hover:bg-gray-800 hover:text-white"
        >
          Abmelden
        </button>
      </div>
    </header>
  )
}
