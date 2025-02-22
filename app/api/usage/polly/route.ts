// app/api/usage/polly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    console.log('Checking role for user:', user.id);

    // Check if user has admin role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user role:', userError);
      return NextResponse.json({ error: "Error checking permissions" }, { status: 500 });
    }

    console.log('User data:', userData);

    if (!userData?.role || userData.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all usage data without the join for now
    const { data: usageData, error: usageError } = await supabase
      .from("polly_usage")
      .select(`
        id,
        user_id,
        characters_synthesized,
        voice_id,
        synthesis_date
      `);

    if (usageError) {
      console.error('Error fetching usage data:', usageError);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    // Get user data separately if needed
    // We can get the user email from auth.users if needed
    if (usageData) {
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id, email')
        .in('id', usageData.map(u => u.user_id));

      if (!authError && authUsers) {
        // Combine the data
        const combinedData = usageData.map(usage => ({
          ...usage,
          user: authUsers.find(au => au.id === usage.user_id)
        }));
        return NextResponse.json(combinedData);
      }
    }

    console.log('Successfully fetched data');
    return NextResponse.json(usageData);

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}