"use client"

import { useState } from "react"
import Layout from "@/components/kokonutui/layout"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Bell,
  Shield,
  Wallet,
  Save,
} from "lucide-react"

export default function SettingsPage() {
  const [platformFee, setPlatformFee] = useState("0.00005")
  const [notifications, setNotifications] = useState(true)
  const [autoApprove, setAutoApprove] = useState(false)

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Configure platform settings and preferences</p>
        </div>

        {/* Platform Fee Settings */}
        <div
          className={cn(
            "rounded-xl overflow-hidden",
            "bg-white dark:bg-zinc-900/70",
            "border border-zinc-100 dark:border-zinc-800",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Platform Fee Configuration</h2>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Configure the platform fee percentage charged on transactions</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Platform Fee (%)</label>
              <Input
                type="text"
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                placeholder="0.00005"
                className="max-w-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Current fee: {(parseFloat(platformFee) * 100).toFixed(5)}% per transaction
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div
          className={cn(
            "rounded-xl overflow-hidden",
            "bg-white dark:bg-zinc-900/70",
            "border border-zinc-100 dark:border-zinc-800",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h2>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Configure admin notification preferences</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Email Notifications</p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Receive email alerts for large transactions</p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Auto-approve Transactions</p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Automatically approve transactions under KES 10,000</p>
              </div>
              <Switch
                checked={autoApprove}
                onCheckedChange={setAutoApprove}
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div
          className={cn(
            "rounded-xl overflow-hidden",
            "bg-white dark:bg-zinc-900/70",
            "border border-zinc-100 dark:border-zinc-800",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Security</h2>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Security and access control settings</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Admin Emails</p>
              <div className="space-y-1">
                {["ijepale@gmail.com", "admin@ongeapesa.com", "ongeapesa.kenya@gmail.com"].map((email) => (
                  <div
                    key={email}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg",
                      "bg-zinc-50 dark:bg-zinc-800"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-zinc-700 dark:text-zinc-300">{email}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2">
                Edit ADMIN_EMAILS in page files to add/remove admins
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg",
              "bg-emerald-600 hover:bg-emerald-700",
              "text-white text-xs font-medium",
              "transition-colors duration-200"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            Save Settings
          </button>
        </div>
      </div>
    </Layout>
  )
}
