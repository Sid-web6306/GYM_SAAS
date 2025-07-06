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

import { loginWithSocialProvider, signupWithEmail, completeSocialOnboarding } from "@/actions/auth.actions";
import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/auth-store";
import { toastActions } from "@/stores/toast-store";
import { withSuspense } from "@/components/providers/suspense-provider";

// Zod schemas for client-side validation
const SignupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const GymNameSchema = z.object({
  gymName: z.string().min(3, "Gym name must be at least 3 characters long"),
});

type SignupFormData = z.infer<typeof SignupSchema>;
type GymNameFormData = z.infer<typeof GymNameSchema>;

// Submit button component with proper accessibility
const SubmitButton = ({ isSocialOnboarding, isSubmitting }: { 
  isSocialOnboarding: boolean;
  isSubmitting: boolean;
}) => {
  const buttonText = isSocialOnboarding ? "Complete Profile" : "Sign up with Email";
  const pendingText = isSocialOnboarding ? "Saving..." : "Signing Up...";

  return (
    <Button 
      type="submit" 
      className="w-full" 
      disabled={isSubmitting}
      aria-describedby={isSubmitting ? "submit-status" : undefined}
    >
      {isSubmitting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          {pendingText}
        </>
      ) : (
        buttonText
      )}
      {isSubmitting && (
        <span id="submit-status" className="sr-only">
          Form is being submitted, please wait
        </span>
      )}
    </Button>
  );
};

const SignUpPageComponent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSocialOnboarding = searchParams.get('social') === 'true';
  
  // Zustand stores
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const userEmail = user?.email || '';

  // Redirect authenticated users to dashboard (except during social onboarding)
  React.useEffect(() => {
    if (isInitialized && isAuthenticated && !isSocialOnboarding) {
      console.log('Signup page: User is authenticated, redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [isInitialized, isAuthenticated, isSocialOnboarding, router]);
  

  
  // React Hook Form setup
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const gymForm = useForm<GymNameFormData>({
    resolver: zodResolver(GymNameSchema),
    defaultValues: {
      gymName: "",
    },
  });
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form submission state when component unmounts or mode changes
  React.useEffect(() => {
    return () => {
      setIsSubmitting(false);
    };
  }, [isSocialOnboarding]);

  // Reset forms when switching between modes (shouldn't happen, but safety)
  React.useEffect(() => {
    if (!isSocialOnboarding) {
      gymForm.reset();
    } else {
      signupForm.reset();
    }
  }, [isSocialOnboarding, gymForm, signupForm]);

  // Handle form submission
  const onSubmit = async (data: SignupFormData | GymNameFormData) => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      if (isSocialOnboarding) {
        // Social onboarding: use completeSocialOnboarding action
        const gymData = data as GymNameFormData;
        formData.append('gym-name', gymData.gymName);
        
        const result = await completeSocialOnboarding(null, formData);
        
        if (result?.error) {
          toastActions.error("Error", result.error.message);
          
          // Set gym name form errors if they exist
          if (result.error.details?.gymName) {
            gymForm.setError('gymName', { message: result.error.details.gymName[0] });
          }
        }
      } else {
        // Regular signup: use signupWithEmail action
        const signupData = data as SignupFormData;
        formData.append('email', signupData.email);
        formData.append('password', signupData.password);
        
        const result = await signupWithEmail(null, formData);
        
        if (result?.error) {
          toastActions.error("Error", result.error.message);
          
          // Set form errors if they exist
          if (result.error.details) {
            if (result.error.details.email) {
              signupForm.setError('email', { message: result.error.details.email[0] });
            }
            if (result.error.details.password) {
              signupForm.setError('password', { message: result.error.details.password[0] });
            }
          }
        }
      }
      // If no error, the server action will handle the redirect
      
    } catch (error) {
      console.error('Signup form error:', error);
      toastActions.error("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking authentication
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while redirecting authenticated user (except during social onboarding)
  if (isAuthenticated && !isSocialOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

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
          {isSocialOnboarding ? (
            <form onSubmit={gymForm.handleSubmit(onSubmit)}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={userEmail}
                    disabled
                    className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    aria-describedby="email-description"
                  />
                  <p id="email-description" className="text-xs text-muted-foreground">
                    This email is from your social login
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gymName">Gym Name *</Label>
                  <Input
                    id="gymName"
                    placeholder="e.g., Powerhouse Fitness"
                    aria-describedby={gymForm.formState.errors.gymName ? "gymName-error" : "gymName-description"}
                    aria-invalid={!!gymForm.formState.errors.gymName}
                    {...gymForm.register('gymName')}
                  />
                  {!gymForm.formState.errors.gymName && (
                    <p id="gymName-description" className="text-xs text-muted-foreground">
                      Enter the name of your gym or fitness center
                    </p>
                  )}
                  {gymForm.formState.errors.gymName && (
                    <p id="gymName-error" className="text-xs text-red-500" role="alert">
                      {gymForm.formState.errors.gymName.message}
                    </p>
                  )}
                </div>
                <SubmitButton isSocialOnboarding={true} isSubmitting={isSubmitting} />
              </div>
            </form>
          ) : (
            <form onSubmit={signupForm.handleSubmit(onSubmit)}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    aria-describedby={signupForm.formState.errors.email ? "email-error" : "email-description"}
                    aria-invalid={!!signupForm.formState.errors.email}
                    {...signupForm.register('email')}
                  />
                  {!signupForm.formState.errors.email && (
                    <p id="email-description" className="text-xs text-muted-foreground">
                      We&apos;ll send you a confirmation email
                    </p>
                  )}
                  {signupForm.formState.errors.email && (
                    <p id="email-error" className="text-xs text-red-500" role="alert">
                      {signupForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    aria-describedby={signupForm.formState.errors.password ? "password-error" : "password-description"}
                    aria-invalid={!!signupForm.formState.errors.password}
                    {...signupForm.register('password')}
                  />
                  {!signupForm.formState.errors.password && (
                    <p id="password-description" className="text-xs text-muted-foreground">
                      Must be at least 6 characters long
                    </p>
                  )}
                  {signupForm.formState.errors.password && (
                    <p id="password-error" className="text-xs text-red-500" role="alert">
                      {signupForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <SubmitButton isSocialOnboarding={false} isSubmitting={isSubmitting} />
              </div>
            </form>
          )}

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

// Wrap with Suspense to handle useSearchParams
const SignUpPage = withSuspense(SignUpPageComponent);

export default SignUpPage;
