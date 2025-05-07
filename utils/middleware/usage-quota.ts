// utils/middleware/usage-quota.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Middleware to check if a user has enough quota for TTS conversion
 */
export async function checkUsageQuota(
  request: NextRequest,
  characterCount: number
) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      allowed: false,
      error: 'Unauthorized',
      status: 401
    };
  }
  
  try {
    // Check if the user has enough quota
    const { data: hasQuota, error: quotaError } = await supabase.rpc(
      'has_available_quota',
      {
        user_id_param: user.id,
        requested_chars: characterCount
      }
    );
    
    if (quotaError) {
      console.error('Error checking quota:', quotaError);
      return {
        allowed: false,
        error: 'Failed to check usage quota',
        status: 500
      };
    }
    
    if (!hasQuota) {
      // Get the user's current tier information
      const { data: tierInfo, error: tierError } = await supabase
        .from('subscriptions')
        .select(`
          subscription_tiers (
            id,
            name,
            monthly_price,
            character_limit
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('tier_id', { ascending: false })
        .limit(1)
        .single();
      
      // Get current usage
      const { data: currentUsage } = await supabase.rpc(
        'get_monthly_character_usage',
        { user_id_param: user.id }
      );
      
      // Default to free tier if no subscription found
      const tierName = tierInfo?.subscription_tiers?.name || 'Free';
      const tierLimit = tierInfo?.subscription_tiers?.character_limit || 1000;
      
      return {
        allowed: false,
        error: 'Usage limit exceeded',
        status: 402, // Payment Required
        quota: {
          used: currentUsage || 0,
          limit: tierLimit,
          tier: tierName,
          requested: characterCount
        }
      };
    }
    
    // If we get here, the user has enough quota
    return {
      allowed: true
    };
    
  } catch (error) {
    console.error('Error in usage quota middleware:', error);
    return {
      allowed: false,
      error: 'Internal server error',
      status: 500
    };
  }
}

/**
 * Track usage after successful TTS conversion
 */
export async function trackUsage(
  userId: string,
  characterCount: number,
  voiceId: string,
  ttsService: string,
  contentHash?: string
) {
  const supabase = await createClient();
  
  try {
    // Insert usage record
    const { error } = await supabase
      .from('tts_usage')
      .insert({
        user_id: userId,
        characters: characterCount,
        voice_id: voiceId,
        tts_service: ttsService,
        content_hash: contentHash
      });
    
    if (error) {
      console.error('Error tracking usage:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in trackUsage:', error);
    return false;
  }
}