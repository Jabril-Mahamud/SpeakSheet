import TtsSettingsForm from "@/components/common/TtsSettingsForm";
import { createClient } from "@/utils/supabase/server";
import { InfoIcon, Settings2, User, Shield } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import posthog from "posthog-js";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
 
  if (!user) {
    return redirect("/sign-in");
  }

  posthog.capture('settings_page_view', { user_id: user.id });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile and text-to-speech preferences
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Profile Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Email Address</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{user.email}</span>
                    {user.email_confirmed_at && (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Account ID</span>
                  <code className="text-xs px-2 py-1 bg-muted rounded-md font-mono text-muted-foreground">
                    {user.id}
                  </code>
                </div>

                {user.last_sign_in_at && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Last Sign In</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(user.last_sign_in_at)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <CardTitle>Text-to-Speech Settings</CardTitle>
              </div>
              <CardDescription>Configure your voice synthesis preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-4">
                    <InfoIcon className="h-5 w-5 mt-0.5 text-blue-500 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Amazon Polly is provided as our default service with high-quality voices. 
                        For ElevenLabs or Google TTS, you'll need to provide your own API key.
                      </p>
                    </div>
                  </div>
                </div>

                <Alert variant="destructive" className="mb-4">
                  <AlertDescription className="text-sm">
                    To use ElevenLabs or Google TTS, please provide an API key from their respective services.
                  </AlertDescription>
                </Alert>

                <Separator />
                
                <TtsSettingsForm />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}