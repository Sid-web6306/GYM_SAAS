// src/app/(auth)/signup/page.tsx

'use client'

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

import { loginWithSocialProvider, signupWithEmail, type SignupFormState } from "@/actions/auth.actions";
import React, { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

// This helper component now dynamically changes its text
const SubmitButton = ({ isSocialOnboarding }: { isSocialOnboarding: boolean }) => {
  const { pending } = useFormStatus();
  
  const buttonText = isSocialOnboarding ? "Complete Profile" : "Sign up with Email";
  const pendingText = isSocialOnboarding ? "Saving..." : "Signing Up...";

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? pendingText : buttonText}
    </Button>
  );
};

const SignUpPage = () => {
  const [state, formAction] = React.useActionState<SignupFormState | null, FormData>(
    signupWithEmail,
    null
  );

  // Read URL params to determine if this is a social onboarding flow
  const searchParams = useSearchParams();
  const isSocialOnboarding = searchParams.get('social') === 'true';
  const message = searchParams.get('message'); 

  useEffect(() => {
    if (state?.error) {
      toast.error("Error", {
        description: state.error.message,
      });
    }
    if (message) {
        toast.info("Next Step", { description: message });
      }
  }, [state, message]);

  // Adapt the title and description based on the mode
  const title = isSocialOnboarding ? "Complete Your Profile" : "Create your account";
  const description = isSocialOnboarding
    ? "Welcome! Just one more step to get started."
    : "Choose your preferred sign up method";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* --- Conditional Rendering Logic --- */}

          {/* 1. Show Social Buttons only if it's a normal sign-up */}
          {!isSocialOnboarding && (
            <>
              <div className="grid grid-cols-1 gap-4">
                <Button
                  variant="outline"
                  onClick={() => loginWithSocialProvider('google')}
                >
                  <FcGoogle className="mr-2 h-5 w-5" />
                  Continue with Google
                </Button>
                <Button
                  variant="outline"
                  className="bg-[#1877F2] text-white hover:bg-[#166eab] hover:text-white"
                  onClick={() => loginWithSocialProvider('facebook')}
                >
                  <FaFacebook className="mr-2 h-5 w-5" />
                  Continue with Facebook
                </Button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            </>
          )}
          
          {/* --- Main Form --- */}
          <form action={formAction}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="gym-name">Gym Name</Label>
                <Input
                  id="gym-name"
                  name="gym-name"
                  placeholder="Powerhouse Fitness"
                  required
                />
                {state?.error?.details?.gymName && (
                  <p className="text-xs text-red-500">{state.error.details.gymName[0]}</p>
                )}
              </div>

              {/* 2. Show Email/Password fields only on normal sign-up */}
              {!isSocialOnboarding && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                    />
                     {state?.error?.details?.email && (
                      <p className="text-xs text-red-500">{state.error.details.email[0]}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                    />
                     {state?.error?.details?.password && (
                      <p className="text-xs text-red-500">{state.error.details.password[0]}</p>
                    )}
                  </div>
                </>
              )}
              
              {/* This hidden input passes the social flag to the server action */}
              <input type="hidden" name="isSocialOnboarding" value={String(isSocialOnboarding)} />

              <SubmitButton isSocialOnboarding={isSocialOnboarding} />
            </div>
          </form>

          {/* 3. Show "Already have an account?" only on normal sign-up */}
          {!isSocialOnboarding && (
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="underline">
                Log in
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpPage;
