"use client"

import type { ReactNode } from "react"
import Sidebar from "./sidebar"
import TopNav from "./top-nav"
import MobileNav from "./mobile-nav"

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-[100dvh]">
      <Sidebar />
      <div className="w-full flex flex-1 flex-col">
        <header className="h-16 border-b border-border">
          <TopNav />
        </header>
        <main className="flex-1 overflow-auto p-6 pb-20 lg:pb-6 bg-background">{children}</main>
        <MobileNav />
      </div>
    </div>
  )
}
