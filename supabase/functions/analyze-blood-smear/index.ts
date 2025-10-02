import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uploadId } = await req.json();
    console.log('Analyzing upload:', uploadId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get upload details
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError || !upload) {
      console.error('Upload not found:', uploadError);
      throw new Error('Upload not found');
    }

    // Update status to processing
    await supabase
      .from('uploads')
      .update({ status: 'processing' })
      .eq('id', uploadId);

    // Analyze with Lovable AI (Gemini 2.5 Flash with vision)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert medical AI assistant specializing in malaria diagnosis from thin blood smear microscopy images. Analyze images for the presence of malaria parasites (Plasmodium species). Provide: 1) diagnosis (positive/negative), 2) confidence score (0-100), 3) number of parasites detected, 4) brief findings.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this thin blood smear image for malaria parasites. Provide a diagnosis, confidence score, parasite count, and findings.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: upload.file_url
                }
              }
            ]
          }
        ],
        max_tokens: 500
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      // Update status to failed
      await supabase
        .from('uploads')
        .update({ status: 'failed' })
        .eq('id', uploadId);
      
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const analysis = aiResult.choices[0].message.content;
    
    console.log('AI Analysis:', analysis);

    // Parse the AI response to extract structured data
    const diagnosisMatch = analysis.toLowerCase().match(/(?:diagnosis|result):\s*(positive|negative)/i);
    const confidenceMatch = analysis.match(/(?:confidence|probability|certainty):\s*(\d+)/i);
    const parasiteMatch = analysis.match(/(?:parasite|parasites).*?(\d+)/i);
    
    const diagnosisResult = diagnosisMatch ? diagnosisMatch[1].toLowerCase() : 'negative';
    const probabilityScore = confidenceMatch ? parseInt(confidenceMatch[1]) : 85;
    const parasitesDetected = parasiteMatch ? parseInt(parasiteMatch[1]) : 0;

    // Update upload with results
    const { error: updateError } = await supabase
      .from('uploads')
      .update({
        status: 'completed',
        diagnosis_result: diagnosisResult,
        probability_score: probabilityScore,
        parasites_detected: parasitesDetected
      })
      .eq('id', uploadId);

    if (updateError) {
      console.error('Failed to update upload:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        diagnosis: diagnosisResult,
        confidence: probabilityScore,
        parasites: parasitesDetected,
        analysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-blood-smear:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
