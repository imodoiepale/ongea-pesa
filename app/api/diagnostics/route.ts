import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const N8N_WEBHOOK_URL = 'https://primary-production-579c.up.railway.app/webhook/send_money'
const N8N_HEALTH_CHECK_URL = process.env.N8N_HEALTH_CHECK_URL || 'https://primary-production-579c.up.railway.app/healthz'

/**
 * GET /api/diagnostics
 * Comprehensive system diagnostic check
 */
export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  }

  // 1. Check Supabase Connection
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      diagnostics.checks.supabase_auth = {
        status: 'error',
        error: authError.message,
        details: 'Failed to authenticate with Supabase'
      }
    } else if (user) {
      diagnostics.checks.supabase_auth = {
        status: 'ok',
        user_id: user.id,
        user_email: user.email
      }

      // Try to query profiles table
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user.id)
          .single()

        if (profileError) {
          diagnostics.checks.supabase_database = {
            status: 'error',
            error: profileError.message,
            details: 'Failed to query profiles table'
          }
        } else {
          diagnostics.checks.supabase_database = {
            status: 'ok',
            balance: profile?.wallet_balance || 0,
            details: 'Successfully connected to database'
          }
        }
      } catch (dbError: any) {
        diagnostics.checks.supabase_database = {
          status: 'error',
          error: dbError.message,
          details: 'Database query failed'
        }
      }
    } else {
      diagnostics.checks.supabase_auth = {
        status: 'warning',
        details: 'No authenticated user (expected for diagnostic endpoint)'
      }
    }
  } catch (supabaseError: any) {
    diagnostics.checks.supabase_connection = {
      status: 'error',
      error: supabaseError.message,
      details: 'Failed to initialize Supabase client'
    }
  }

  // 2. Check ElevenLabs Configuration
  const agentId = process.env.NEXT_PUBLIC_AGENT_ID
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY
  
  diagnostics.checks.elevenlabs_config = {
    agent_id_configured: !!agentId,
    agent_id: agentId ? `${agentId.substring(0, 8)}...` : 'NOT SET',
    api_key_configured: !!elevenLabsKey,
    status: agentId && elevenLabsKey ? 'ok' : 'error',
    details: agentId && elevenLabsKey 
      ? 'ElevenLabs credentials configured' 
      : 'Missing ElevenLabs configuration'
  }

  // 3. Check n8n Webhook Connectivity (using health check endpoint)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    // Use GET for health check endpoint instead of POST to transaction endpoint
    const n8nResponse = await fetch(N8N_HEALTH_CHECK_URL, {
      method: 'GET',
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    diagnostics.checks.n8n_webhook = {
      status: n8nResponse.ok ? 'ok' : 'warning',
      http_status: n8nResponse.status,
      health_check_url: N8N_HEALTH_CHECK_URL,
      webhook_url: N8N_WEBHOOK_URL,
      details: n8nResponse.ok 
        ? 'n8n service is reachable' 
        : `n8n health check responded with status ${n8nResponse.status}`
    }
  } catch (n8nError: any) {
    diagnostics.checks.n8n_webhook = {
      status: 'warning', // Changed from 'error' to 'warning' since we're not testing actual webhook
      error: n8nError.name === 'AbortError' ? 'Connection timeout' : n8nError.message,
      health_check_url: N8N_HEALTH_CHECK_URL,
      webhook_url: N8N_WEBHOOK_URL,
      details: 'Could not reach n8n health check endpoint (this is expected if Railway endpoint does not have /healthz)'
    }
  }

  // 4. Check Environment Variables
  diagnostics.checks.environment_variables = {
    NEXT_PUBLIC_AGENT_ID: !!process.env.NEXT_PUBLIC_AGENT_ID,
    ELEVENLABS_API_KEY: !!process.env.ELEVENLABS_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    N8N_WEBHOOK_AUTH_TOKEN: !!process.env.N8N_WEBHOOK_AUTH_TOKEN,
    status: 'ok'
  }

  // 5. Overall Health Status
  const allChecks = Object.values(diagnostics.checks)
  const hasErrors = allChecks.some((check: any) => check.status === 'error')
  const hasWarnings = allChecks.some((check: any) => check.status === 'warning')

  diagnostics.overall_status = hasErrors ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy'

  return NextResponse.json(diagnostics, { status: 200 })
}
