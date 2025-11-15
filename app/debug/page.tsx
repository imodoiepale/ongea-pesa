"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Database, Zap, MessageSquare, Activity } from 'lucide-react'

interface DiagnosticCheck {
  status: 'ok' | 'error' | 'warning'
  [key: string]: any
}

interface Diagnostics {
  overall_status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    [key: string]: DiagnosticCheck
  }
}

interface WebhookLog {
  id: string
  timestamp: string
  method: string
  success: boolean
  user_id?: string
  error?: string
  duration_ms?: number
  body?: any
  n8n_response?: any
}

export default function DebugPage() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null)
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)

      // Fetch diagnostics
      const diagResponse = await fetch('/api/diagnostics')
      if (diagResponse.ok) {
        const diagData = await diagResponse.json()
        setDiagnostics(diagData)
      }

      // Fetch webhook logs
      const logsResponse = await fetch('/api/voice/webhook/logs')
      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setWebhookLogs(logsData.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch debug data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'error':
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: any = {
      ok: 'default',
      healthy: 'default',
      warning: 'secondary',
      degraded: 'secondary',
      error: 'destructive',
      unhealthy: 'destructive',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading diagnostics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Diagnostics</h1>
            <p className="text-gray-600 mt-1">Monitor webhook calls and system health</p>
          </div>
          <Button onClick={fetchData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Overall Status */}
        {diagnostics && (
          <Alert className={
            diagnostics.overall_status === 'healthy' 
              ? 'border-green-500 bg-green-50' 
              : diagnostics.overall_status === 'degraded'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-red-500 bg-red-50'
          }>
            {getStatusIcon(diagnostics.overall_status)}
            <AlertDescription className="ml-2">
              <span className="font-semibold">System Status: </span>
              {diagnostics.overall_status.toUpperCase()} - Last checked {new Date(diagnostics.timestamp).toLocaleTimeString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Webhook Logs Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Webhook Request Logs
            </CardTitle>
            <CardDescription>
              {webhookLogs.length === 0 
                ? 'No webhook requests received yet. Try making a voice transaction.'
                : `${webhookLogs.length} recent webhook requests`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {webhookLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No webhook calls detected</p>
                <p className="text-sm mt-1">Make sure your ElevenLabs agent is configured correctly.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {webhookLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-lg border ${
                      log.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {log.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-semibold text-sm">
                            {log.success ? 'Success' : 'Failed'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          {log.duration_ms && (
                            <Badge variant="outline" className="text-xs">
                              {log.duration_ms}ms
                            </Badge>
                          )}
                        </div>
                        
                        {log.user_id && (
                          <p className="text-xs text-gray-600 mb-1">
                            User: {log.user_id.slice(0, 8)}...
                          </p>
                        )}
                        
                        {log.body && (
                          <div className="text-xs text-gray-700 mb-1">
                            <span className="font-medium">Transaction:</span> {log.body.type} - 
                            KSh {log.body.amount} 
                            {log.body.phone && ` to ${log.body.phone}`}
                          </div>
                        )}
                        
                        {log.error && (
                          <p className="text-xs text-red-600 mt-2">
                            Error: {log.error}
                          </p>
                        )}
                        
                        {log.n8n_response && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-600 cursor-pointer">
                              View n8n response
                            </summary>
                            <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                              {JSON.stringify(log.n8n_response, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Checks */}
        {diagnostics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supabase Check */}
            {diagnostics.checks.supabase_auth && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Supabase Connection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Auth Status</span>
                      {getStatusBadge(diagnostics.checks.supabase_auth.status)}
                    </div>
                    {diagnostics.checks.supabase_auth.user_email && (
                      <p className="text-sm text-gray-600">
                        User: {diagnostics.checks.supabase_auth.user_email}
                      </p>
                    )}
                    {diagnostics.checks.supabase_database && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Database</span>
                        {getStatusBadge(diagnostics.checks.supabase_database.status)}
                      </div>
                    )}
                    {diagnostics.checks.supabase_auth.error && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {diagnostics.checks.supabase_auth.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ElevenLabs Check */}
            {diagnostics.checks.elevenlabs_config && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    ElevenLabs Config
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Configuration</span>
                      {getStatusBadge(diagnostics.checks.elevenlabs_config.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Agent ID: {diagnostics.checks.elevenlabs_config.agent_id}</p>
                      <p>API Key: {diagnostics.checks.elevenlabs_config.api_key_configured ? '✓ Configured' : '✗ Missing'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* n8n Webhook Check */}
            {diagnostics.checks.n8n_webhook && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    n8n Webhook
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Connection</span>
                      {getStatusBadge(diagnostics.checks.n8n_webhook.status)}
                    </div>
                    {diagnostics.checks.n8n_webhook.http_status && (
                      <p className="text-sm text-gray-600">
                        HTTP Status: {diagnostics.checks.n8n_webhook.http_status}
                      </p>
                    )}
                    {diagnostics.checks.n8n_webhook.health_check_url && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-700">Health Check:</p>
                        <p className="text-xs text-gray-500 break-all">
                          {diagnostics.checks.n8n_webhook.health_check_url}
                        </p>
                      </div>
                    )}
                    {diagnostics.checks.n8n_webhook.webhook_url && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-700">Webhook URL:</p>
                        <p className="text-xs text-gray-500 break-all">
                          {diagnostics.checks.n8n_webhook.webhook_url}
                        </p>
                      </div>
                    )}
                    {diagnostics.checks.n8n_webhook.error && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {diagnostics.checks.n8n_webhook.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Environment Variables */}
            {diagnostics.checks.environment_variables && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Environment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {Object.entries(diagnostics.checks.environment_variables)
                      .filter(([key]) => key !== 'status')
                      .map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-gray-600 font-mono text-xs">{key}</span>
                          {value ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Debugging Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">If no webhook requests appear:</h4>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Check if your ElevenLabs agent webhook URL is correctly configured</li>
                <li>Verify the webhook URL in ElevenLabs points to your deployment (check ngrok/production URL)</li>
                <li>Make sure the send_money tool is properly configured in ElevenLabs</li>
                <li>Try the test endpoint: <code className="bg-gray-100 px-1 rounded">/api/voice/webhook/test</code></li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">If Supabase shows errors:</h4>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Check your internet connection and Supabase service status</li>
                <li>Verify environment variables are correct in .env.local</li>
                <li>Check if you're authenticated (try logging out and back in)</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">If n8n shows errors:</h4>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Verify your n8n webhook is running on Railway</li>
                <li>Check if the n8n webhook URL is correct</li>
                <li>Ensure n8n workflow is activated</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
