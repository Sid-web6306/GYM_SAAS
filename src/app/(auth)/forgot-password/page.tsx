// src/app/(auth)/forgot-password/page.tsx

'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword, type ForgotPasswordFormState } from "@/actions/auth.actions";
import Link from "next/link";
import React, { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending..." : "Send Reset Email"}
    </Button>
  );
};

const ForgotPasswordPage = () => {
  const [state, formAction] = useActionState<ForgotPasswordFormState | null, FormData>(forgotPassword, null);

  useEffect(() => {
    if (state?.error) {
      toast.error("Error", { description: state.error });
    }
    if (state?.success) {
      toast.success("Success", { description: state.success });
    }
  }, [state]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset your password
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
                <SubmitButton />
              </div>
            </form>
          </div>
          <div className="mt-4 text-center text-sm">
            Remember your password?{" "}
            <Link href="/login" className="underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
