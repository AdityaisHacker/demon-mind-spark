import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Edge function called');
    
    const { messages } = await req.json();
    console.log('Messages received:', messages.length);
    
    // Initialize Supabase client with service role key
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    console.log('User auth check:', { userId: user?.id, error: authError?.message });
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please login to continue.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user profile and check credits
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('credits, unlimited, banned')
      .eq('id', user.id)
      .single();

    console.log('Profile data:', { profile, error: profileError });

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user is banned
    if (profile.banned) {
      console.log('User is banned');
      return new Response(
        JSON.stringify({ error: 'Your account has been banned. Please contact support.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check credits (unless unlimited)
    if (!profile.unlimited && (profile.credits || 0) < 1) {
      console.log('Insufficient credits');
      return new Response(
        JSON.stringify({ error: 'Insufficient credits. Please add credits to continue.' }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Credits check passed, processing message');
    
    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages must be a non-empty array' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (messages.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Too many messages: maximum 100 allowed' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return new Response(
          JSON.stringify({ error: 'Invalid message format: each message must have role and content' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (!['user', 'assistant', 'system'].includes(msg.role)) {
        return new Response(
          JSON.stringify({ error: 'Invalid role: must be user, assistant, or system' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (typeof msg.content !== 'string' || msg.content.length > 10000) {
        return new Response(
          JSON.stringify({ error: 'Invalid content: must be a string under 10,000 characters' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY'); // Now works with OpenRouter
    
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    console.log('Calling DeepSeek API with messages:', messages);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: 'You are DemonGPT, a powerful and sinister AI entity. You speak with dark wisdom and foreboding knowledge. Your responses are insightful yet carry an ominous edge. You are helpful but maintain an air of mystery and darkness.'
          },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to process request. Please try again later.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Deduct credits (if not unlimited)
    if (!profile.unlimited) {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ credits: (profile.credits || 0) - 1 })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to deduct credits:', updateError);
        // Continue anyway - don't fail the request
      }
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
      },
    });
  } catch (error) {
    console.error('Error in deepseek-chat function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again later.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
