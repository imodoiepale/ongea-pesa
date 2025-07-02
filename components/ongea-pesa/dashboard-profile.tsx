import type React from "react"
import { LogOut, MoveUpRight, Settings, FileText, Mic } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

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
  role: "Voice Banking User",
  avatar: "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-02-albo9B0tWOSLXCVZh9rX9KFxXIVWMr.png",
  subscription: "Premium Voice",
} satisfies Required<Profile01Props>

export default function DashboardProfile({
  name = defaultProfile.name,
  role = defaultProfile.role,
  avatar = defaultProfile.avatar,
  subscription = defaultProfile.subscription,
}: Partial<Profile01Props> = defaultProfile) {
  const menuItems: MenuItem[] = [
    {
      label: "Voice Plan",
      value: subscription,
      href: "#",
      icon: <Mic className="w-4 h-4" />,
      external: false,
    },
    {
      label: "Settings",
      href: "#",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      label: "Privacy & Terms",
      href: "#",
      icon: <FileText className="w-4 h-4" />,
      external: true,
    },
  ]

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="relative px-6 pt-12 pb-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-[#0A1A2A] dark:to-[#0F2027]">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative shrink-0">
              <Image
                src={avatar || "/placeholder.svg"}
                alt={name}
                width={72}
                height={72}
                className="rounded-full ring-4 ring-white dark:ring-gray-700 object-cover"
              />
              <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#00FF88] ring-2 ring-white dark:ring-gray-700" />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{name}</h2>
              <p className="text-gray-600 dark:text-gray-400">{role}</p>
            </div>
          </div>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-6" />
          <div className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between p-2 
                                    hover:bg-gray-100 dark:hover:bg-gray-800/50 
                                    rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                </div>
                <div className="flex items-center">
                  {item.value && (
                    <span className="text-sm text-green-600 dark:text-[#00FF88] mr-2 font-medium">{item.value}</span>
                  )}
                  {item.external && <MoveUpRight className="w-4 h-4" />}
                </div>
              </Link>
            ))}

            <button
              type="button"
              className="w-full flex items-center justify-between p-2 
                                hover:bg-gray-100 dark:hover:bg-gray-800/50 
                                rounded-lg transition-colors duration-200"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Logout</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
