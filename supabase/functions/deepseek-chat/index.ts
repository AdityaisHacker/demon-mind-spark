import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
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
