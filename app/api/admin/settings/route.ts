import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { captureServerEvent } from '@/utils/posthog-server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(settings);

  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const updates = await request.json();
    
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .upsert({
        updated_at: new Date().toISOString(),
        updated_by: user.id,
        ...updates
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Track settings update
    await captureServerEvent('admin_settings_updated', user, {
      updatedFields: Object.keys(updates)
    });

    return NextResponse.json(settings);

  } catch (error) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}