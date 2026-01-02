import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  Clock,
  Calendar,
  Upload,
  Brain,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Departments', to: '/departments', icon: Building2 },
  { name: 'Employees', to: '/employees', icon: Users },
  { name: 'Shift Templates', to: '/shift-templates', icon: Clock },
  { name: 'Schedules', to: '/schedules', icon: Calendar },
  { name: 'Import', to: '/import', icon: Upload },
  { name: 'ML Training', to: '/ml-training', icon: Brain },
  { name: 'Settings', to: '/settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-white">
      <nav className="space-y-1 p-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
