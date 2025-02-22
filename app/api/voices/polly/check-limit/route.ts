import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PollyUsageTracker } from "@/utils/polly-usage-tracker";

interface RequestBody {
  characters: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as RequestBody;
    
    if (typeof body.characters !== 'number' || body.characters < 0) {
      return NextResponse.json(
        { error: "Invalid characters count" },
        { status: 400 }
      );
    }

    // Check for custom credentials
    const { data: settings, error: settingsError } = await supabase
      .from('user_tts_settings')
      .select('api_key')
      .eq('id', user.id)
      .single();

    if (settingsError) {
      console.error('Error fetching user settings:', settingsError);
    } else if (settings?.api_key) {
      return NextResponse.json({ allowed: true });
    }

    // Check usage limits
    const usageLimits = await PollyUsageTracker.checkUsageLimits(
      user.id,
      body.characters
    );

    return NextResponse.json(usageLimits);

  } catch (error) {
    console.error('Error checking usage limit:', error);
    return NextResponse.json(
      {
        error: "Failed to check usage limit",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}