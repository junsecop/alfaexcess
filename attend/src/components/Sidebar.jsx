import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',              label: 'Dashboard',    icon: '⊞', roles: ['admin','manager','staff','customer'] },
  { to: '/attendance',   label: 'Attendance',   icon: '✓', roles: ['admin','manager','staff'] },
  { to: '/work-log',     label: 'Work Log',     icon: '⚑', roles: ['admin','manager','staff'] },
  { to: '/billing',      label: 'Billing',      icon: '₹', roles: ['admin','manager','staff','customer'] },
  { to: '/data-uploads', label: 'Data Uploads', icon: '↑', roles: ['admin','manager'] },
  { to: '/products',     label: 'Products',     icon: '◈', roles: ['admin','manager','staff','customer'] },
  { to: '/notifications',label: 'Notifications',icon: '🔔', roles: ['admin','manager','staff','customer'] },
  { to: '/settings',     label: 'Settings',     icon: '⚙', roles: ['admin','manager','staff','customer'] },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const visible = navItems.filter(n => n.roles.includes(user?.role))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      style={{ background: '#111318', minHeight: '100vh' }}
      className={`flex flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'} shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <span className="text-[#c8f04a] text-xl font-bold leading-none">A</span>
        {!collapsed && (
          <span className="text-white font-semibold text-sm tracking-wide truncate">Alfanex</span>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-white/40 hover:text-white text-xs"
          aria-label="Toggle sidebar"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
               ${isActive
                 ? 'bg-[#c8f04a] text-[#111318] font-semibold'
                 : 'text-white/60 hover:text-white hover:bg-white/8'}`
            }
          >
            <span className="text-base shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#c8f04a] flex items-center justify-center shrink-0">
            <span className="text-[#111318] text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-white/40 text-xs truncate capitalize">{user?.role}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={handleLogout}
            className="mt-3 w-full text-left text-white/40 hover:text-white text-xs px-1"
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  )
}
