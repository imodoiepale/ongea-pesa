"use client"

import { useCallback, useEffect, useState } from "react"
import Layout from "@/components/kokonutui/layout"
import { VoiceEnginePanel } from "@/components/admin/voice-engine-panel"
import { SettingsGroup, SettingsRow } from "@/components/admin/settings-row"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { AlertTriangle, Bell, Check, Coins, Gauge, Loader2, ShieldCheck } from "lucide-react"

/**
 * Admin settings.
 *
 * Previously three of its four panels were useState stubs that persisted
 * nothing — and the platform fee was displayed 100x wrong (it held 0.00005 and
 * rendered "0.00500%", while PLATFORM_FEE_RATE is 0.005, i.e. 0.5%). Everything
 * here now reads and writes /api/admin/settings.
 *
 * Visual system is the DepthMe port: og-list-group / og-list-caption for the
 * inset-grouped list, og-stagger for the reveal, og-press for tap feedback.
 * Optimistic writes with revert-on-failure, following DepthMe's SettingsScreen.
 */

interface SettingRow {
  key: string
  value: unknown
  description: string | null
  updated_by: string | null
  updated_at: string
}

type SettingsMap = Record<string, unknown>

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({})
  const [meta, setMeta] = useState<Record<string, SettingRow>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fee is a text field, so it needs its own draft state — reformatting the
  // input on every keystroke fights the user mid-typing.
  const [feeDraft, setFeeDraft] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/settings")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not load settings")
      const map: SettingsMap = {}
      const metaMap: Record<string, SettingRow> = {}
      for (const row of (json.settings ?? []) as SettingRow[]) {
        map[row.key] = row.value
        metaMap[row.key] = row
      }
      setSettings(map)
      setMeta(metaMap)
      setFeeDraft(String(Number(map.platform_fee_rate ?? 0) * 100))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (key: string, value: unknown) => {
    const previous = settings[key]
    setSettings((s) => ({ ...s, [key]: value })) // optimistic
    setSaving(key)
    setError(null)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { [key]: value } }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not save")
      setSavedKey(key)
      window.setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1800)
    } catch (err) {
      setSettings((s) => ({ ...s, [key]: previous })) // revert
      setError(err instanceof Error ? err.message : "Could not save")
    } finally {
      setSaving(null)
    }
  }

  const commitFee = async () => {
    const pct = Number(feeDraft)
    if (!Number.isFinite(pct) || pct < 0 || pct > 5) {
      setError("Platform fee must be between 0% and 5%.")
      setFeeDraft(String(Number(settings.platform_fee_rate ?? 0) * 100))
      return
    }
    const rate = Math.round((pct / 100) * 1e6) / 1e6
    if (rate === Number(settings.platform_fee_rate)) return
    await save("platform_fee_rate", rate)
  }

  const savedTick = (key: string) =>
    saving === key ? (
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    ) : savedKey === key ? (
      <Check className="h-4 w-4 text-brand" />
    ) : null

  const feeRate = Number(settings.platform_fee_rate ?? 0)

  return (
    <Layout>
      <div className="og-screen-in space-y-5">
        <header className="og-uncover" style={{ "--i": 0 } as React.CSSProperties}>
          <h1 className="og-screen-title text-foreground">Settings</h1>
          <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted-foreground">
            Platform-wide configuration. Changes take effect immediately and are audited.
          </p>
        </header>

        {error && (
          <div className={cn("og-glass flex items-start gap-2 p-3", "border-red-500/40")}>
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="og-glass flex items-center justify-center p-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="og-stagger space-y-5">
            {/* Nested sections each inherit the staggered reveal for free. */}
            <VoiceEnginePanel />

            <SettingsGroup caption="Revenue">
              <SettingsRow
                icon={Coins}
                iconColor="#10b981"
                label="Platform fee"
                description={`Currently ${(feeRate * 100).toFixed(3)}% of every outbound transaction`}
                control={
                  <div className="flex items-center gap-2">
                    {savedTick("platform_fee_rate")}
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="5"
                        value={feeDraft}
                        onChange={(e) => setFeeDraft(e.target.value)}
                        onBlur={commitFee}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur()
                        }}
                        className="og-num h-9 w-20 border-border/60 bg-muted/30 text-right"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                }
              />
              <SettingsRow
                icon={Gauge}
                iconColor="#f59e0b"
                label="Large transaction threshold"
                description="Above this amount a transaction is flagged as large"
                divider={false}
                control={
                  <div className="flex items-center gap-2">
                    {savedTick("large_transaction_threshold")}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">KSh</span>
                      <Input
                        type="number"
                        step="500"
                        min="0"
                        value={String(settings.large_transaction_threshold ?? 0)}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            large_transaction_threshold: Number(e.target.value),
                          }))
                        }
                        onBlur={(e) =>
                          save("large_transaction_threshold", Number(e.target.value))
                        }
                        className="og-num h-9 w-24 border-border/60 bg-muted/30 text-right"
                      />
                    </div>
                  </div>
                }
              />
            </SettingsGroup>

            <SettingsGroup caption="Operations">
              <SettingsRow
                icon={Bell}
                iconColor="#3b82f6"
                label="Email notifications"
                description="Alert admins when a large transaction completes"
                control={
                  <div className="flex items-center gap-2">
                    {savedTick("email_notifications_enabled")}
                    <Switch
                      checked={Boolean(settings.email_notifications_enabled)}
                      onCheckedChange={(v) => save("email_notifications_enabled", v)}
                      disabled={saving === "email_notifications_enabled"}
                    />
                  </div>
                }
              />
              <SettingsRow
                icon={ShieldCheck}
                iconColor="#a855f7"
                label="Auto-approve small transactions"
                description="Skip manual review below the threshold above"
                divider={false}
                control={
                  <div className="flex items-center gap-2">
                    {savedTick("auto_approve_enabled")}
                    <Switch
                      checked={Boolean(settings.auto_approve_enabled)}
                      onCheckedChange={(v) => save("auto_approve_enabled", v)}
                      disabled={saving === "auto_approve_enabled"}
                    />
                  </div>
                }
              />
            </SettingsGroup>

            {/* Where the value came from and who last touched it. A settings page
                that cannot answer "who changed the fee?" is missing the point. */}
            {meta.platform_fee_rate?.updated_by && (
              <p className="px-1 text-[11px] text-muted-foreground">
                Platform fee last changed by {meta.platform_fee_rate.updated_by} on{" "}
                {new Date(meta.platform_fee_rate.updated_at).toLocaleDateString("en-KE")}.
              </p>
            )}

            <div className="og-glass flex items-start gap-2 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  The platform fee applies to real charges.
                </span>{" "}
                Server money paths read this value live, cached for up to 60 seconds — saving here
                clears the cache so the next transaction uses the new rate. Client-side estimates
                shown to users before a payment still use the compiled default until the page is
                rebuilt, so avoid large mid-session changes.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
