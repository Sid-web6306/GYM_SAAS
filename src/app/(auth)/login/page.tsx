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

// --- CORRECTED IMPORTS ---
import React, { useEffect, useActionState } from "react"; // Import useActionState from 'react'
import { useFormStatus } from "react-dom"; // useFormStatus remains in 'react-dom'
// ---

import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Logging in..." : "Log in"}
    </Button>
  );
};

const LoginPage = () => {
  // --- CORRECTED HOOK USAGE ---
  // We use the imported 'useActionState' directly
  const [state, formAction] = useActionState<LoginFormState, FormData>(loginWithEmail, { error: null });

  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  useEffect(() => {
    if (state?.error) {
      toast.error("Login Error", { description: state.error });
    }
    if (message) {
      toast.error("Error", { description: message });
    }
  }, [state, message]);

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
                  <Label htmlFor="password">Password</Label>
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

export default LoginPage;
