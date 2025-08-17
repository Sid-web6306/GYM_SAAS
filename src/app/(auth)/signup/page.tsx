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
import { Loader2 } from "lucide-react";

import { loginWithSocialProvider, signupWithEmail } from "@/actions/auth.actions";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from '@/hooks/use-auth';
import { toastActions } from "@/stores/toast-store";
import { authUIActions } from "@/stores/auth-store";
import { withSuspense } from "@/components/providers/suspense-provider";

// Zod schema for client-side validation
const SignupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type SignupFormData = z.infer<typeof SignupSchema>;

// Social login button component
const SocialButton = ({ 
  provider, 
  onClick, 
  isLoading, 
  disabled 
}: { 
  provider: 'google' | 'facebook';
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
}) => {
  const Icon = provider === 'google' ? FcGoogle : FaFacebook;
  const text = `Continue with ${provider === 'google' ? 'Google' : 'Facebook'}`;
  const bgColor = provider === 'google' ? 'bg-white' : 'bg-blue-600';
  const textColor = provider === 'google' ? 'text-gray-700' : 'text-white';
  const borderColor = provider === 'google' ? 'border-gray-300' : 'border-blue-600';

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full ${bgColor} ${textColor} border ${borderColor} hover:bg-opacity-90 transition-all duration-200`}
      onClick={onClick}
      disabled={disabled}
      aria-describedby={isLoading ? `${provider}-loading` : undefined}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2" />
          Connecting...
          <span id={`${provider}-loading`} className="sr-only">
            Connecting to {provider}
          </span>
        </>
      ) : (
        <>
          <Icon className="mr-2 h-4 w-4" />
          {text}
        </>
      )}
    </Button>
  );
};

// Note: SubmitButton component replaced with inline button

const SignUpPageComponent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get invitation token from search params
  const inviteToken = searchParams.get('invite') || '';
  console.log('inviteToken', inviteToken)
  
  // Use TanStack Query hooks for auth state
  const { isAuthenticated, isLoading } = useAuth();

  // Social auth loading states
  const [socialLoading, setSocialLoading] = React.useState<{
    google: boolean;
    facebook: boolean;
  }>({ google: false, facebook: false });

  // Redirect authenticated users to dashboard
  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('Signup page: User is authenticated, redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  // React Hook Form setup
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Enhanced social login handler
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(prev => ({ ...prev, [provider]: true }));
    
    try {
      // Mark user as new for social auth
      authUIActions.setIsNewUser(true);
      
      toastActions.info(
        'Redirecting...', 
        `Redirecting to ${provider === 'google' ? 'Google' : 'Facebook'} for authentication.`
      );
      
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      let redirectTo: string|undefined = `${origin}/auth/callback` ;

      if(inviteToken) {
        redirectTo = `${origin}/auth/callback?invite=${inviteToken}`
      } else {
        redirectTo = origin 
          ? `${origin}/auth/callback`
          : undefined
      }

      await loginWithSocialProvider(provider, {
        redirectTo,
        scopes: provider === 'google' 
          ? 'email profile openid' 
          : 'email public_profile'
      });
    } catch (error) {
      console.error(`${provider} login error:`, error);
      toastActions.error(
        'Authentication Error', 
        `Failed to connect with ${provider === 'google' ? 'Google' : 'Facebook'}. Please try again.`
      );
    } finally {
      setTimeout(() => {
        setSocialLoading(prev => ({ ...prev, [provider]: false }));
      }, 3000);
    }
  };

  // Handle email signup
  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    
    try {
      // Mark user as new for email signup
      authUIActions.setIsNewUser(true);
      
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('password', data.password);
      
      // Include invitation token if present
      if (inviteToken) {
        console.log('inviteToken', inviteToken)
        formData.append('inviteToken', inviteToken);
      }
      
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
      // If no error, the server action will handle the redirect
      
    } catch (error) {
      console.error('Signup form error:', error);
      toastActions.error("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking authentication
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {isAuthenticated 
              ? 'Redirecting to dashboard...' 
              : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }



  const isSocialButtonDisabled = isSubmitting || socialLoading.google || socialLoading.facebook;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Choose your preferred sign up method</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Social Login Buttons */}
          <div className="grid grid-cols-1 gap-4">
            <SocialButton
              provider="google"
              onClick={() => handleSocialLogin('google')}
              isLoading={socialLoading.google}
              disabled={isSocialButtonDisabled}
            />
            {/* <SocialButton
              provider="facebook"
              onClick={() => handleSocialLogin('facebook')}
              isLoading={socialLoading.facebook}
              disabled={isSocialButtonDisabled}
            /> */}
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
          
          {/* Email Signup Form */}
          <form onSubmit={signupForm.handleSubmit(onSubmit)}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...signupForm.register('email')}
                />
                {signupForm.formState.errors.email && (
                  <p className="text-xs text-red-500">
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
                  {...signupForm.register('password')}
                />
                {signupForm.formState.errors.password && (
                  <p className="text-xs text-red-500">
                    {signupForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full transition-all duration-200" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating Account...
                  </>
                ) : (
                  "Sign up with Email"
                )}
              </Button>
            </div>
          </form>

          { inviteToken && <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>}

          <div className="mt-2 text-center text-sm">
            <Link href="/" className="underline">
              Go to home page
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrap with Suspense to handle useSearchParams
const SignUpPage = withSuspense(SignUpPageComponent);

export default SignUpPage;
