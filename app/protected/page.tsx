import TtsSettingsForm from "@/components/common/TtsSettingsForm";
import { createClient } from "@/utils/supabase/server";
import { InfoIcon, Settings2, User } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-lg">
            Manage your account and text-to-speech preferences
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle>Profile</CardTitle>
              </div>
              <CardDescription>Your account information and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Email Address</label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{user.email}</span>
                    {user.email_confirmed_at && (
                      <Badge variant="secondary" className="text-xs">Verified</Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">User ID</label>
                  <span className="font-mono text-xs text-muted-foreground">{user.id}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Last Sign In</label>
                  <span className="text-muted-foreground">
                    {user.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Never'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                <CardTitle>Text-to-Speech Settings</CardTitle>
              </div>
              <CardDescription>Configure your preferred TTS service and voice options</CardDescription>
            </CardHeader>
            <CardContent>
              <TtsSettingsForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}