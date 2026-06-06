'use client'

import { LogOut, MoveUpRight, Settings, CreditCard, FileText } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/components/providers/auth-provider"

interface MenuItem {
  label: string
  value?: string
  href: string
  icon?: React.ReactNode
  external?: boolean
}

interface Profile01Props {
  name: string
  role: string
  avatar: string
  subscription?: string
}

const defaultProfile = {
  name: "Eugene An",
  role: "Prompt Engineer",
  avatar: "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-02-albo9B0tWOSLXCVZh9rX9KFxXIVWMr.png",
  subscription: "Free Trial",
} satisfies Required<Profile01Props>

export default function Profile01({
  name = defaultProfile.name,
  role = defaultProfile.role,
  avatar = defaultProfile.avatar,
  subscription = defaultProfile.subscription,
}: Partial<Profile01Props> = defaultProfile) {
  const { user, signOut } = useAuth()
  
  // Use authenticated user data if available
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || name
  const displayRole = user?.user_metadata?.role || role
  const displayAvatar = user?.user_metadata?.avatar_url || avatar
  const menuItems: MenuItem[] = [
    {
      label: "Subscription",
      value: subscription,
      href: "#",
      icon: <CreditCard className="w-4 h-4" />,
      external: false,
    },
    {
      label: "Settings",
      href: "#",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      label: "Terms & Policies",
      href: "#",
      icon: <FileText className="w-4 h-4" />,
      external: true,
    },
  ]

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-border/60">
        <div className="relative px-6 pt-12 pb-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative shrink-0">
              <Image
                src={displayAvatar}
                alt={displayName}
                width={72}
                height={72}
                className="rounded-full ring-4 ring-card object-cover"
              />
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-brand ring-2 ring-card" />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">{displayName}</h2>
              <p className="text-muted-foreground">{displayRole}</p>
              {user?.email && (
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              )}
            </div>
          </div>
          <div className="h-px bg-border/60 my-6" />
          <div className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between p-2
                                    hover:bg-muted/50
                                    rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <div className="flex items-center">
                  {item.value && <span className="text-sm text-muted-foreground mr-2">{item.value}</span>}
                  {item.external && <MoveUpRight className="w-4 h-4" />}
                </div>
              </Link>
            ))}

            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center justify-between p-2 
                                hover:bg-red-50 dark:hover:bg-red-900/20 
                                rounded-lg transition-colors duration-200 group"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Logout</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
