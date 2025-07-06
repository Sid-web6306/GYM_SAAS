// src/app/(auth)/reset-password/page.tsx

'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword, type ResetPasswordFormState } from "@/actions/auth.actions";
import Link from "next/link";
import React, { useEffect } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toastActions } from "@/stores/toast-store";
import { useRouter } from "next/navigation";

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Updating..." : "Update Password"}
    </Button>
  );
};

const ResetPasswordPage = () => {
  const [state, formAction] = useActionState<ResetPasswordFormState | null, FormData>(resetPassword, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.error) {
      toastActions.error("Error", state.error);
    }
    if (state?.success) {
      toastActions.success("Password Updated", state.success);
      // Redirect to login after successful password update
      setTimeout(() => {
        router.push('/login');
      }, 2000); // Give user time to see the success message
    }
  }, [state, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <form action={formAction}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    required
                    minLength={6}
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

export default ResetPasswordPage;
