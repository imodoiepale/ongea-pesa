"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { Bell, ChevronRight, Mic, Moon, Sun } from "lucide-react"
import Profile01 from "./dashboard-profile"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function DashboardTopNav() {
  const { theme, setTheme } = useTheme()

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Ongea Pesa", href: "#" },
    { label: "Dashboard", href: "#" },
  ]

  return (
    <nav className="px-3 sm:px-6 flex items-center justify-between h-full">
      <div className="font-medium text-sm hidden sm:flex items-center space-x-1 truncate max-w-[300px]">
        {breadcrumbs.map((item, index) => (
          <div key={item.label} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 mx-1" />}
            {item.href ? (
              <Link
                href={item.href}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-100">{item.label}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
        {/* Voice Command Button */}
        <Button
          size="sm"
          className="bg-gradient-to-r from-green-500 to-blue-600 dark:from-[#00FF88] dark:to-[#00D4AA] hover:from-green-600 hover:to-blue-700 dark:hover:from-[#00E67A] dark:hover:to-[#00C299] text-white border-0"
        >
          <Mic className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Voice</span>
        </Button>

        <button
          type="button"
          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-full transition-colors"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" />
        </button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-gray-600" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Image
              src="https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-01-n0x8HFv8EUetf9z6ht0wScJKoTHqf8.png"
              alt="User avatar"
              width={28}
              height={28}
              className="rounded-full ring-2 ring-gray-200 dark:ring-gray-600 sm:w-8 sm:h-8 cursor-pointer"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-[280px] sm:w-80 bg-white/90 dark:bg-[#0A1A2A]/90 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          >
            <Profile01 avatar="https://ferf1mheo22r9ira.public.blob.vercel-storage.com/avatar-01-n0x8HFv8EUetf9z6ht0wScJKoTHqf8.png" />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
