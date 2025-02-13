import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface AdminSettings {
  default_voice_id: string;
  rate_limit_daily: number;
  rate_limit_monthly: number;
  max_file_size_mb: number;
  require_email_verification: boolean;
  allow_public_sharing: boolean;
  maintenance_mode: boolean;
}

export const AdminSettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>({
    default_voice_id: "Joanna",
    rate_limit_daily: 100000,
    rate_limit_monthly: 1000000,
    max_file_size_mb: 10,
    require_email_verification: true,
    allow_public_sharing: false,
    maintenance_mode: false
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: "Settings saved",
        description: "Your changes have been applied successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Settings */}
          <div className="space-y-4">
            <Label>Default Voice</Label>
            <Select
              value={settings.default_voice_id}
              onValueChange={(value) => 
                setSettings(prev => ({ ...prev, default_voice_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Joanna">Joanna (Female)</SelectItem>
                <SelectItem value="Matthew">Matthew (Male)</SelectItem>
                <SelectItem value="Ivy">Ivy (Female Child)</SelectItem>
                <SelectItem value="Justin">Justin (Male Child)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rate Limits */}
          <div className="space-y-4">
            <Label>Daily Character Limit</Label>
            <Input
              type="number"
              value={settings.rate_limit_daily}
              onChange={(e) => 
                setSettings(prev => ({ 
                  ...prev, 
                  rate_limit_daily: parseInt(e.target.value) 
                }))
              }
            />
          </div>

          <div className="space-y-4">
            <Label>Monthly Character Limit</Label>
            <Input
              type="number"
              value={settings.rate_limit_monthly}
              onChange={(e) => 
                setSettings(prev => ({ 
                  ...prev, 
                  rate_limit_monthly: parseInt(e.target.value) 
                }))
              }
            />
          </div>

          <div className="space-y-4">
            <Label>Max File Size (MB)</Label>
            <Input
              type="number"
              value={settings.max_file_size_mb}
              onChange={(e) => 
                setSettings(prev => ({ 
                  ...prev, 
                  max_file_size_mb: parseInt(e.target.value) 
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                Users must verify their email before using the service
              </p>
            </div>
            <Switch
              checked={settings.require_email_verification}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ 
                  ...prev, 
                  require_email_verification: checked 
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Public Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Users can share their converted audio files publicly
              </p>
            </div>
            <Switch
              checked={settings.allow_public_sharing}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ 
                  ...prev, 
                  allow_public_sharing: checked 
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Temporarily disable new conversions
              </p>
            </div>
            <Switch
              checked={settings.maintenance_mode}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ 
                  ...prev, 
                  maintenance_mode: checked 
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
};