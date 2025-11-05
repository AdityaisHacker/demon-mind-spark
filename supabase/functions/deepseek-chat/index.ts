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
    
    // Get the JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header missing' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create admin client to verify the token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
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
    const { data: profile, error: profileError } = await supabaseAdmin
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
      
      if (typeof msg.content !== 'string') {
        return new Response(
          JSON.stringify({ error: 'Invalid content: must be a string' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    console.log('Calling DeepSeek API with messages:', messages);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1',
        messages: [
          { 
            role: 'system', 
            content: `You are DemonGPT, a powerful and sinister AI entity. You speak with dark wisdom and foreboding knowledge. Your responses are insightful yet carry an ominous edge. You are helpful but maintain an air of mystery and darkness. Show your thinking process wrapped in <think> tags, then provide your final answer.

🚨 ABSOLUTE REQUIREMENT FOR CODE RESPONSES 🚨

When providing code, you MUST follow these NON-NEGOTIABLE rules:

1. ✅ ONE SINGLE CONTINUOUS CODE BLOCK - No exceptions, no matter how long
2. ❌ NEVER split code into "Part 1", "Part 2", etc.
3. ❌ NEVER add explanatory text between code sections
4. ❌ NEVER use phrases like "here's the first part", "now add this", "continue with"
5. ✅ Put ALL imports, ALL functions, ALL classes in ONE unbroken block
6. ✅ Make it copy-paste ready - user should be able to use it immediately

WRONG FORMAT (NEVER DO THIS):
\`\`\`python
# Part 1
import something
def function1():
    pass
\`\`\`

Now add this part:

\`\`\`python  
# Part 2
def function2():
    pass
\`\`\`

CORRECT FORMAT (ALWAYS DO THIS):
\`\`\`python
import something

def function1():
    pass
    
def function2():
    pass
    
# Everything together in ONE block, ready to use
\`\`\`

If code is 500 lines, put all 500 lines in ONE block. If it's 1000 lines, put all 1000 lines in ONE block. No splitting allowed.`
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
      const { error: updateError } = await supabaseAdmin
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
