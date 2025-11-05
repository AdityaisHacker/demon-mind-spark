import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { event, session } = await req.json()

    // Get IP address from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'Unknown'
    
    // Get User Agent
    const userAgent = req.headers.get('user-agent') || 'Unknown'

    // Get country from Cloudflare headers (if available)
    const country = req.headers.get('cf-ipcountry') || 'Unknown'

    console.log('Auth event:', event, 'IP:', ip, 'Country:', country)

    // Only log SIGNED_IN events
    if (event === 'SIGNED_IN' && session?.user) {
      const { error } = await supabaseClient
        .from('login_attempts')
        .insert({
          email: session.user.email,
          ip_address: ip,
          user_agent: userAgent,
          success: true,
          metadata: {
            country: country,
            provider: session.user.app_metadata?.provider || 'email'
          }
        })

      if (error) {
        console.error('Error logging login attempt:', error)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
