import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export type Message = {
  message?: string;
  error?: string;
  success?: string;
};

export function FormMessage({ message }: { message: Message }) {
  if (!message.error && !message.message && !message.success) return null;

  const content = message.error || message.message || message.success;
  const isError = !!message.error;
  const isSuccess = !!message.success;

  return (
    <Alert variant={isError ? "destructive" : isSuccess ? "default" : "default"} className="mt-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{content}</AlertDescription>
    </Alert>
  );
}