'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Check if we have hash parameters (old implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (accessToken && type === 'signup') {
          // Set the session using the tokens from the hash
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (error) {
            setError(error.message)
            return
          }

          // Redirect to home
          router.push('/')
          return
        }

        // Check for query parameters (PKCE flow)
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (errorParam) {
          setError(errorDescription || errorParam)
          return
        }

        if (code) {
          // Exchange code for session
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            setError(error.message)
            return
          }

          // Redirect to home
          router.push('/')
          return
        }

        // No valid parameters found
        setError('Invalid confirmation link')
      } catch (err) {
        setError('An error occurred during confirmation')
        console.error(err)
      }
    }

    handleEmailConfirmation()
  }, [router, supabase])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="max-w-md w-full bg-background p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-destructive mb-4">Confirmation Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary">
      <div className="max-w-md w-full bg-background p-8 rounded-lg shadow-lg text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Confirming your email...</h1>
        <p className="text-muted-foreground">Please wait while we verify your account.</p>
      </div>
    </div>
  )
}
