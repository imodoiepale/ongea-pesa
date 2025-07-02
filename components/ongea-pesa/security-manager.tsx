"use client"

import { useState } from "react"
import {
  ArrowLeft,
  Shield,
  Fingerprint,
  Eye,
  Mic,
  Smartphone,
  MessageSquare,
  Phone,
  Lock,
  Grid3X3,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Activity,
  Settings,
  Download,
  Share2,
  Plus,
  Trash2,
  Edit,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"

interface SecurityManagerProps {
  onNavigate?: (screen: string) => void
}

interface AuthMethod {
  id: string
  name: string
  type: "biometric" | "2fa" | "traditional"
  icon: any
  enabled: boolean
  reliability: number
  lastUsed?: string
  setupComplete: boolean
  color: string
}

interface SecurityEvent {
  id: string
  type: "login" | "failed_attempt" | "settings_change" | "suspicious_activity"
  description: string
  timestamp: string
  location: string
  device: string
  status: "success" | "failed" | "warning"
}

export default function SecurityManager({ onNavigate }: SecurityManagerProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [isTestingBiometric, setIsTestingBiometric] = useState<string | null>(null)
  const [securityScore, setSecurityScore] = useState(87)
  const [autoLockTimeout, setAutoLockTimeout] = useState([5])
  const [transactionLimit, setTransactionLimit] = useState([10000])
  const [emergencyPin, setEmergencyPin] = useState("")
  const [emergencyContacts, setEmergencyContacts] = useState([
    { id: "1", name: "Jane Doe", phone: "+254 722 123 456", relationship: "Spouse" },
    { id: "2", name: "John Smith", phone: "+254 733 987 654", relationship: "Brother" },
  ])

  const [authMethods, setAuthMethods] = useState<AuthMethod[]>([
    {
      id: "fingerprint",
      name: "Fingerprint Scanner",
      type: "biometric",
      icon: Fingerprint,
      enabled: true,
      reliability: 98,
      lastUsed: "2 minutes ago",
      setupComplete: true,
      color: "bg-green-500",
    },
    {
      id: "face",
      name: "Face Recognition",
      type: "biometric",
      icon: Eye,
      enabled: true,
      reliability: 95,
      lastUsed: "1 hour ago",
      setupComplete: true,
      color: "bg-blue-500",
    },
    {
      id: "voice",
      name: "Voice Recognition",
      type: "biometric",
      icon: Mic,
      enabled: false,
      reliability: 92,
      setupComplete: false,
      color: "bg-purple-500",
    },
    {
      id: "iris",
      name: "Iris Scanner",
      type: "biometric",
      icon: Eye,
      enabled: false,
      reliability: 99,
      setupComplete: false,
      color: "bg-indigo-500",
    },
    {
      id: "sms",
      name: "SMS Verification",
      type: "2fa",
      icon: MessageSquare,
      enabled: true,
      reliability: 85,
      lastUsed: "Yesterday",
      setupComplete: true,
      color: "bg-orange-500",
    },
    {
      id: "authenticator",
      name: "Authenticator App",
      type: "2fa",
      icon: Smartphone,
      enabled: false,
      reliability: 96,
      setupComplete: false,
      color: "bg-teal-500",
    },
    {
      id: "phone_call",
      name: "Phone Call Verification",
      type: "2fa",
      icon: Phone,
      enabled: false,
      reliability: 88,
      setupComplete: false,
      color: "bg-cyan-500",
    },
    {
      id: "pin",
      name: "Security PIN",
      type: "traditional",
      icon: Lock,
      enabled: true,
      reliability: 75,
      lastUsed: "5 minutes ago",
      setupComplete: true,
      color: "bg-gray-500",
    },
    {
      id: "pattern",
      name: "Pattern Lock",
      type: "traditional",
      icon: Grid3X3,
      enabled: false,
      reliability: 70,
      setupComplete: false,
      color: "bg-pink-500",
    },
    {
      id: "password",
      name: "Password",
      type: "traditional",
      icon: Key,
      enabled: true,
      reliability: 80,
      lastUsed: "3 days ago",
      setupComplete: true,
      color: "bg-red-500",
    },
  ])

  const [securityEvents] = useState<SecurityEvent[]>([
    {
      id: "1",
      type: "login",
      description: "Successful fingerprint authentication",
      timestamp: "2024-01-15 14:30:25",
      location: "Nairobi, Kenya",
      device: "iPhone 14 Pro",
      status: "success",
    },
    {
      id: "2",
      type: "failed_attempt",
      description: "Failed face recognition attempt",
      timestamp: "2024-01-15 14:29:45",
      location: "Nairobi, Kenya",
      device: "iPhone 14 Pro",
      status: "failed",
    },
    {
      id: "3",
      type: "settings_change",
      description: "Auto-lock timeout changed to 5 minutes",
      timestamp: "2024-01-15 12:15:30",
      location: "Nairobi, Kenya",
      device: "iPhone 14 Pro",
      status: "success",
    },
    {
      id: "4",
      type: "suspicious_activity",
      description: "Login attempt from new device",
      timestamp: "2024-01-14 22:45:12",
      location: "Mombasa, Kenya",
      device: "Samsung Galaxy S23",
      status: "warning",
    },
    {
      id: "5",
      type: "login",
      description: "SMS verification successful",
      timestamp: "2024-01-14 18:20:15",
      location: "Nairobi, Kenya",
      device: "iPhone 14 Pro",
      status: "success",
    },
  ])

  const handleToggleAuth = (methodId: string) => {
    setAuthMethods((prev) =>
      prev.map((method) => (method.id === methodId ? { ...method, enabled: !method.enabled } : method)),
    )

    // Recalculate security score
    const enabledMethods = authMethods.filter((m) => m.enabled).length
    const biometricEnabled = authMethods.filter((m) => m.type === "biometric" && m.enabled).length
    const twoFAEnabled = authMethods.filter((m) => m.type === "2fa" && m.enabled).length

    let newScore = 40 // Base score
    newScore += enabledMethods * 8 // 8 points per enabled method
    newScore += biometricEnabled * 15 // Bonus for biometric
    newScore += twoFAEnabled * 12 // Bonus for 2FA

    setSecurityScore(Math.min(100, newScore))
  }

  const handleTestBiometric = (methodId: string) => {
    setIsTestingBiometric(methodId)

    setTimeout(() => {
      setIsTestingBiometric(null)
      // Simulate test result
      const success = Math.random() > 0.2 // 80% success rate
      if (success) {
        alert("Biometric test successful!")
      } else {
        alert("Biometric test failed. Please try again.")
      }
    }, 3000)
  }

  const handleSetupMethod = (methodId: string) => {
    setAuthMethods((prev) =>
      prev.map((method) => (method.id === methodId ? { ...method, setupComplete: true, enabled: true } : method)),
    )
    alert(`${authMethods.find((m) => m.id === methodId)?.name} setup completed!`)
  }

  const handleBackNavigation = () => {
    if (onNavigate) {
      onNavigate("dashboard")
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "login":
        return CheckCircle
      case "failed_attempt":
        return XCircle
      case "settings_change":
        return Settings
      case "suspicious_activity":
        return AlertTriangle
      default:
        return Activity
    }
  }

  const getEventColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300"
      case "failed":
        return "text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-300"
      case "warning":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300"
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 95) return "text-green-600"
    if (reliability >= 85) return "text-blue-600"
    if (reliability >= 75) return "text-yellow-600"
    return "text-red-600"
  }

  const addEmergencyContact = () => {
    const newContact = {
      id: Date.now().toString(),
      name: "",
      phone: "",
      relationship: "",
    }
    setEmergencyContacts((prev) => [...prev, newContact])
  }

  const removeEmergencyContact = (id: string) => {
    setEmergencyContacts((prev) => prev.filter((contact) => contact.id !== id))
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-4 sm:mb-6">
        <Button variant="ghost" size="icon" onClick={handleBackNavigation} className="mr-3 h-8 w-8 sm:h-10 sm:w-10">
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Security Manager</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Manage authentication & security settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Security Score</p>
            <p
              className={`text-sm font-bold ${securityScore >= 80 ? "text-green-600" : securityScore >= 60 ? "text-yellow-600" : "text-red-600"}`}
            >
              {securityScore}%
            </p>
          </div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${securityScore >= 80 ? "bg-green-100" : securityScore >= 60 ? "bg-yellow-100" : "bg-red-100"}`}
          >
            <Shield
              className={`h-4 w-4 ${securityScore >= 80 ? "text-green-600" : securityScore >= 60 ? "text-yellow-600" : "text-red-600"}`}
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="biometric" className="text-xs sm:text-sm">
            <Fingerprint className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Biometric</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs sm:text-sm">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Monitor</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {/* Security Score Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center justify-between">
                <span>Security Overview</span>
                <Badge
                  className={`${securityScore >= 80 ? "bg-green-100 text-green-800" : securityScore >= 60 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"} text-xs`}
                >
                  {securityScore >= 80 ? "Excellent" : securityScore >= 60 ? "Good" : "Needs Improvement"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span>Overall Security Score</span>
                  <span className="font-bold">{securityScore}%</span>
                </div>
                <Progress value={securityScore} className="h-2" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Fingerprint className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-lg sm:text-xl font-bold">
                    {authMethods.filter((m) => m.type === "biometric" && m.enabled).length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Biometric</p>
                </div>

                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Smartphone className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-lg sm:text-xl font-bold">
                    {authMethods.filter((m) => m.type === "2fa" && m.enabled).length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">2FA Methods</p>
                </div>

                <div className="text-center">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Lock className="h-4 w-4 text-purple-600" />
                  </div>
                  <p className="text-lg sm:text-xl font-bold">
                    {authMethods.filter((m) => m.type === "traditional" && m.enabled).length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Traditional</p>
                </div>

                <div className="text-center">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <p className="text-lg sm:text-xl font-bold">{authMethods.filter((m) => m.enabled).length}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authentication Methods */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Authentication Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {authMethods.slice(0, 6).map((method) => {
                  const IconComponent = method.icon
                  return (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 ${method.color} rounded-lg flex items-center justify-center`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-xs sm:text-sm">{method.name}</p>
                            {method.enabled && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 text-xs px-1 py-0">
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className={getReliabilityColor(method.reliability)}>
                              {method.reliability}% reliable
                            </span>
                            {method.lastUsed && (
                              <>
                                <span>•</span>
                                <span>Used {method.lastUsed}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={method.enabled}
                        onCheckedChange={() => handleToggleAuth(method.id)}
                        disabled={!method.setupComplete}
                      />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Security Events */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents.slice(0, 3).map((event) => {
                  const IconComponent = getEventIcon(event.type)
                  return (
                    <div
                      key={event.id}
                      className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${getEventColor(event.status)}`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm">{event.description}</p>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{event.timestamp}</span>
                          <span>•</span>
                          <MapPin className="h-3 w-3" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="biometric" className="space-y-4 sm:space-y-6">
          {/* Biometric Methods */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {authMethods
              .filter((m) => m.type === "biometric")
              .map((method) => {
                const IconComponent = method.icon
                return (
                  <Card key={method.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm sm:text-base flex items-center space-x-2">
                        <div className={`w-6 h-6 ${method.color} rounded-lg flex items-center justify-center`}>
                          <IconComponent className="h-3 w-3 text-white" />
                        </div>
                        <span>{method.name}</span>
                        {method.enabled && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 text-xs">
                            Active
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span>Reliability</span>
                          <span className={`font-bold ${getReliabilityColor(method.reliability)}`}>
                            {method.reliability}%
                          </span>
                        </div>
                        <Progress value={method.reliability} className="h-2" />
                      </div>

                      {method.lastUsed && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">Last used: {method.lastUsed}</div>
                      )}

                      <div className="flex flex-col space-y-2">
                        {!method.setupComplete ? (
                          <Button onClick={() => handleSetupMethod(method.id)} size="sm" className="w-full text-xs">
                            <Plus className="h-3 w-3 mr-2" />
                            Setup {method.name}
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleTestBiometric(method.id)}
                              disabled={isTestingBiometric === method.id}
                              size="sm"
                              variant="outline"
                              className="w-full text-xs"
                            >
                              {isTestingBiometric === method.id ? (
                                <>
                                  <Activity className="h-3 w-3 mr-2 animate-spin" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-2" />
                                  Test {method.name}
                                </>
                              )}
                            </Button>
                            <div className="flex space-x-2">
                              <Switch checked={method.enabled} onCheckedChange={() => handleToggleAuth(method.id)} />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {method.enabled ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>

          {/* Setup Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Biometric Setup Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span>Setup Completion</span>
                    <span className="font-bold">
                      {Math.round(
                        (authMethods.filter((m) => m.type === "biometric" && m.setupComplete).length /
                          authMethods.filter((m) => m.type === "biometric").length) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (authMethods.filter((m) => m.type === "biometric" && m.setupComplete).length /
                        authMethods.filter((m) => m.type === "biometric").length) *
                      100
                    }
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">
                      {authMethods.filter((m) => m.type === "biometric" && m.setupComplete).length}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Setup Complete</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-600">
                      {authMethods.filter((m) => m.type === "biometric" && !m.setupComplete).length}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Pending Setup</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4 sm:space-y-6">
          {/* Security Events */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base">Security Event Log</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs bg-transparent">
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs bg-transparent">
                    <Share2 className="h-3 w-3 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents.map((event) => {
                  const IconComponent = getEventIcon(event.type)
                  return (
                    <div
                      key={event.id}
                      className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${getEventColor(event.status)}`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-xs sm:text-sm">{event.description}</p>
                          <Badge className={`${getEventColor(event.status)} text-xs px-2 py-0`}>{event.status}</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{event.timestamp}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Smartphone className="h-3 w-3" />
                            <span>{event.device}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Security Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">Authentication Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">94.2%</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Last 30 days</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Successful</span>
                      <span className="font-bold text-green-600">847</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Failed</span>
                      <span className="font-bold text-red-600">52</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Total Attempts</span>
                      <span className="font-bold">899</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">Device Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium">iPhone 14 Pro</span>
                    </div>
                    <span className="text-xs text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-xs font-medium">MacBook Pro</span>
                    </div>
                    <span className="text-xs text-gray-600">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-xs font-medium">Samsung Galaxy S23</span>
                    </div>
                    <span className="text-xs text-yellow-600">New device</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 sm:space-y-6">
          {/* Security Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto-lock timeout */}
              <div>
                <Label className="text-xs sm:text-sm font-medium">Auto-lock timeout</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Automatically lock the app after inactivity
                </p>
                <div className="space-y-2">
                  <Slider
                    value={autoLockTimeout}
                    onValueChange={setAutoLockTimeout}
                    max={30}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>1 min</span>
                    <span className="font-medium">{autoLockTimeout[0]} minutes</span>
                    <span>30 min</span>
                  </div>
                </div>
              </div>

              {/* Transaction limits */}
              <div>
                <Label className="text-xs sm:text-sm font-medium">Authentication required for transactions above</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Require additional authentication for large transactions
                </p>
                <div className="space-y-2">
                  <Slider
                    value={transactionLimit}
                    onValueChange={setTransactionLimit}
                    max={50000}
                    min={1000}
                    step={1000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>KSh 1,000</span>
                    <span className="font-medium">KSh {transactionLimit[0].toLocaleString()}</span>
                    <span>KSh 50,000</span>
                  </div>
                </div>
              </div>

              {/* Failed attempts */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Lock after failed attempts</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Lock account after 5 consecutive failed attempts
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              {/* Biometric fallback */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Biometric fallback</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Allow PIN/password when biometric fails</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Access */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Emergency Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Emergency PIN */}
              <div>
                <Label htmlFor="emergency-pin" className="text-xs sm:text-sm font-medium">
                  Emergency PIN
                </Label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  6-digit PIN for emergency access when biometric fails
                </p>
                <Input
                  id="emergency-pin"
                  type="password"
                  placeholder="Enter 6-digit PIN"
                  value={emergencyPin}
                  onChange={(e) => setEmergencyPin(e.target.value)}
                  maxLength={6}
                  className="text-xs sm:text-sm"
                />
              </div>

              {/* Emergency Contacts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs sm:text-sm font-medium">Emergency Contacts</Label>
                  <Button
                    onClick={addEmergencyContact}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-transparent"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Contact
                  </Button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Contacts who can help with account recovery
                </p>
                <div className="space-y-3">
                  {emergencyContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm">{contact.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                          <span>{contact.phone}</span>
                          <span>•</span>
                          <span>{contact.relationship}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-600"
                          onClick={() => removeEmergencyContact(contact.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Security Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Login notifications</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Get notified of all login attempts</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Suspicious activity alerts</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Alert for unusual account activity</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Security updates</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Notifications about security improvements</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs sm:text-sm font-medium">Weekly security reports</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Weekly summary of security events</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
