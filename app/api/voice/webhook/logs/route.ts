import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestLogs } from '../route'

/**
 * GET /api/voice/webhook/logs
 * Returns all recent webhook requests for debugging
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const logs = getRequestLogs()

    return NextResponse.json({
      success: true,
      total_requests: logs.length,
      logs: logs,
      message: 'These are the last webhook requests received by the server',
      note: 'Logs reset when server restarts. For persistent logs, check server console output.'
    })

  } catch (error) {
    console.error('Error fetching webhook logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    )
  }
}
