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
    
    if (!uploadId) {
      throw new Error('Upload ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the upload record
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError) throw uploadError;

    console.log('Analyzing upload:', uploadId, 'Image URL:', upload.file_url);

    // Update status to processing
    await supabase
      .from('uploads')
      .update({ status: 'processing' })
      .eq('id', uploadId);

    // Call Lovable AI with vision capabilities
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
            content: 'You are an expert medical AI assistant specialized in analyzing blood smear microscopy images for malaria parasite detection. Analyze the image carefully and provide a detailed diagnosis.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this blood smear image for malaria parasites. Provide: 1) Diagnosis result (positive/negative), 2) Confidence score (0-100), 3) Number of parasites detected (if any), 4) Brief description of findings. Format your response as JSON with keys: result, confidence, parasites_count, description.'
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
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    console.log('AI Response:', aiContent);

    // Parse the AI response
    let result = 'negative';
    let confidence = 50;
    let parasitesCount = 0;
    let description = aiContent;

    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = parsed.result?.toLowerCase().includes('positive') ? 'positive' : 'negative';
        confidence = parsed.confidence || 50;
        parasitesCount = parsed.parasites_count || 0;
        description = parsed.description || aiContent;
      } else {
        // Fallback: analyze the text content
        const lowerContent = aiContent.toLowerCase();
        result = lowerContent.includes('positive') || lowerContent.includes('detected') ? 'positive' : 'negative';
        
        // Extract confidence if mentioned
        const confidenceMatch = aiContent.match(/(\d+)%/);
        if (confidenceMatch) {
          confidence = parseInt(confidenceMatch[1]);
        }
        
        // Extract parasite count if mentioned
        const parasiteMatch = aiContent.match(/(\d+)\s*parasite/i);
        if (parasiteMatch) {
          parasitesCount = parseInt(parasiteMatch[1]);
        }
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
    }

    // Update the upload record with results
    const { error: updateError } = await supabase
      .from('uploads')
      .update({
        status: 'completed',
        diagnosis_result: result,
        probability_score: confidence,
        parasites_detected: parasitesCount,
      })
      .eq('id', uploadId);

    if (updateError) throw updateError;

    // Create a report
    await supabase
      .from('reports')
      .insert({
        user_id: upload.user_id,
        upload_id: uploadId,
        result_summary: `Diagnosis: ${result.toUpperCase()}\nConfidence: ${confidence}%\nParasites detected: ${parasitesCount}\n\nAnalysis:\n${description}`,
        recommendations: result === 'positive' 
          ? 'Immediate medical consultation recommended. Follow up with confirmatory testing and appropriate antimalarial treatment if confirmed.'
          : 'No malaria parasites detected. Continue monitoring if symptoms persist. Consult healthcare provider for any concerns.'
      });

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        confidence,
        parasitesCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-blood-smear function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Analysis failed',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
