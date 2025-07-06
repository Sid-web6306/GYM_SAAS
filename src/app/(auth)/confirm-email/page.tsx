'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import React from "react";
import { createClient } from "@/utils/supabase/client";
import { toastActions } from "@/stores/toast-store";
import { useAuthStore } from "@/stores/auth-store";

const ConfirmEmailPage = () => {
  const user = useAuthStore(state => state.user)
  const initialize = useAuthStore(state => state.initialize)
  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Get fresh user data on mount
  React.useEffect(() => {
    initialize();
  }, [initialize]);

  const handleResendEmail = async () => {
    const currentEmail = user?.email || '';
    if (!currentEmail) {
      toastActions.error("Error", "Please sign up again to get a confirmation email.");
      return;
    }

    setIsResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: currentEmail,
      });

      if (error) {
        toastActions.error("Error", error.message);
      } else {
        toastActions.success("Success", "Confirmation email sent successfully!");
        setEmailSent(true);
      }
    } catch {
      toastActions.error("Error", "Failed to resend email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription className="text-center">
            We&apos;ve sent a confirmation link to your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <CheckCircle className="h-4 w-4" />
              <span>Click the link in your email to confirm your account</span>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              After confirming your email, you&apos;ll be redirected to complete your gym profile.
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Didn&apos;t receive the email? Check your spam folder or try resending.
              </p>
              
              <Button 
                variant="outline" 
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? "Sending..." : emailSent ? "Email sent!" : "Resend confirmation email"}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Wrong email address?{" "}
                <Link href="/signup" className="text-blue-600 hover:underline">
                  Sign up again
                </Link>
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmEmailPage;