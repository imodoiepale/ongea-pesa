import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Check if Supabase credentials are configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase credentials not configured in environment variables')
    return response
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Refresh session if expired - with timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase connection timeout')), 5000)
    )
    
    try {
      await Promise.race([
        supabase.auth.getUser(),
        timeoutPromise
      ])
    } catch (error: any) {
      // Handle invalid refresh token by clearing auth cookies
      if (error?.code === 'refresh_token_not_found' || error?.message?.includes('Refresh Token')) {
        // Clear the invalid auth cookies
        const cookiesToClear = ['sb-access-token', 'sb-refresh-token']
        for (const cookieName of cookiesToClear) {
          response.cookies.set(cookieName, '', { maxAge: 0, path: '/' })
        }
        // Also clear any Supabase auth cookies (they use project ref in name)
        request.cookies.getAll().forEach((cookie) => {
          if (cookie.name.includes('-auth-token')) {
            response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
          }
        })
      }
      // Don't throw - allow request to continue
    }
  } catch (error) {
    console.error('⚠️ Supabase middleware error (non-blocking):', error)
    // Don't throw - allow request to continue
  }

  return response
}
