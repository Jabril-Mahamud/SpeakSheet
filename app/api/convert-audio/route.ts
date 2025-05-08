// app/api/convert-audio/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { tts_service, ...restParams } = await request.json();
    
    // Determine which service to use
    let serviceEndpoint;
    switch (tts_service) {
      case 'ElevenLabs':
        serviceEndpoint = '/api/convert-audio/elevenlabs';
        break;
      case 'Amazon':
      default:
        serviceEndpoint = '/api/convert-audio/polly';
        break;
    }
    
    // Forward the request to the appropriate service
    const response = await fetch(new URL(serviceEndpoint, request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(restParams),
    });
    
    // Pass through the response
    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
    
  } catch (error) {
    console.error('Error routing TTS request:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process audio conversion request'
    }, { status: 500 });
  }
}