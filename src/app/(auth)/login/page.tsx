// src/app/(auth)/login/page.tsx

'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithEmail, loginWithSocialProvider, type LoginFormState } from "@/actions/auth.actions";
import Link from "next/link";
import { FaFacebook } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import React, { useEffect } from "react";
import {  useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuthMessage, AuthMessageKey } from "@/lib/auth-messages";
import { useAuthStore } from "@/stores/auth-store";
import { toastActions } from "@/stores/toast-store";
import { withSuspense } from "@/components/providers/suspense-provider";

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Logging in..." : "Log in"}
    </Button>
  );
};

const LoginPageComponent = () => {
  const [state, formAction] = useActionState<LoginFormState | null, FormData>(loginWithEmail, null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Check if user is already authenticated
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      console.log('Login page: User is authenticated, redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [isInitialized, isAuthenticated, router]);



  useEffect(() => {
    if (state?.error) {
      toastActions.error("Login Error", state.error);
    }
    
    // Handle URL-based auth messages
    const messageKey = searchParams.get('message');
    if (messageKey) {
      const message = getAuthMessage(messageKey as AuthMessageKey);
      if (message) {
        toastActions.error("Authentication Error", message);
      }
    }
  }, [state, searchParams]);

  // Show loading while checking authentication (with timeout)
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show loading while redirecting authenticated user
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>
            Enter your email below to log in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <form action={formAction}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="ml-auto inline-block text-sm underline">
                      Forgot your password?
                    </Link>
                  </div>
                  <Input id="password" name="password" type="password" required />
                </div>
                <SubmitButton />
              </div>
            </form>
            
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={() => loginWithSocialProvider('google')}>
                <FcGoogle className="mr-2 h-4 w-4" />
                Google
              </Button>
              <Button variant="outline" className="bg-[#1877F2] text-white hover:bg-[#166eab]" onClick={() => loginWithSocialProvider('facebook')}>
                <FaFacebook className="mr-2 h-4 w-4" />
                Facebook
              </Button>
            </div>

          </div>
          <div className="mt-4 text-center text-sm">
            {`Don't have an account? `}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrap with Suspense to handle useSearchParams
const LoginPage = withSuspense(LoginPageComponent);

export default LoginPage;
