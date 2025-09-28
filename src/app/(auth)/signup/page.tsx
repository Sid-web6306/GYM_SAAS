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

import { signupWithEmail, loginWithSocialProvider } from "@/actions/auth.actions";
import React from "react";
import {  useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from '@/hooks/use-auth';
import { toastActions } from "@/stores/toast-store";
import { withSuspense } from "@/components/providers/suspense-provider";
import { useInviteVerification } from "@/hooks/use-invitations";
import { Building2, Users, AlertCircle } from "lucide-react";
import { logger } from '@/lib/logger';

// Zod schema for client-side validation (passwordless)
const SignupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type SignupFormData = z.infer<typeof SignupSchema>;

// Social login button component
const SocialButton = ({ 
  provider, 
  onClick, 
  isLoading, 
  disabled,
  hasInvitation = false
}: { 
  provider: 'google' | 'facebook';
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
  hasInvitation?: boolean;
}) => {
  const Icon = provider === 'google' ? FcGoogle : FaFacebook;
  const text = hasInvitation 
    ? `Accept invitation with ${provider === 'google' ? 'Google' : 'Facebook'}`
    : `Continue with ${provider === 'google' ? 'Google' : 'Facebook'}`;
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
  const searchParams = useSearchParams();
  
  // Get invitation token from search params
  const inviteToken = searchParams.get('invite') || '';
  
  // Verify invitation if token exists
  const {
    invitation,
    isValid: isValidInvite,
    isLoading: isVerifyingInvite,
    error: inviteError
  } = useInviteVerification(inviteToken);
  
  // Use TanStack Query hooks for auth state
  const { isAuthenticated, isLoading } = useAuth();

  // Social auth loading states
  const [socialLoading, setSocialLoading] = React.useState<{
    google: boolean;
    facebook: boolean;
  }>({ google: false, facebook: false });

  // Redirect authenticated users to dashboard
  // Middleware handles authentication redirects - no client redirect needed

  // React Hook Form setup
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      email: ""
    },
  });
  
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Create bound server actions for social login
  const handleGoogleLogin = loginWithSocialProvider.bind(null, 'google', {
    inviteToken: inviteToken || undefined
  });
  
  const handleFacebookLogin = loginWithSocialProvider.bind(null, 'facebook', {
    inviteToken: inviteToken || undefined
  });

  // Social login handler
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(prev => ({ ...prev, [provider]: true }));
    
    try {
      toastActions.info(
        'Redirecting...', 
        `Redirecting to ${provider === 'google' ? 'Google' : 'Facebook'} for authentication.`
      );
      
      // Call the bound server action
      if (provider === 'google') {
        await handleGoogleLogin();
      } else {
        await handleFacebookLogin();
      }
      
      // Server action will handle redirect, so this code won't be reached
      // unless there's an error
      
    } catch (error) {
      logger.error(`${provider} OAuth error:`, {error});
      
      // Provide more specific error messages
      let errorMessage = `Failed to connect with ${provider === 'google' ? 'Google' : 'Facebook'}. Please try again.`;
      
      if (error instanceof Error) {
        if (error.message.includes('popup_blocked')) {
          errorMessage = 'Pop-up was blocked. Please allow pop-ups for this site and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }
      
      toastActions.error('Authentication Error', errorMessage);
      setSocialLoading(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Handle email signup
  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    
    try {
      // Mark user as new for email signup (simplified - no longer using auth store)
      // authUIActions.setIsNewUser(true);
      
      const formData = new FormData();
      formData.append('email', data.email);
      
      // Include invitation token if present
      if (inviteToken) {
        formData.append('inviteToken', inviteToken);
      }
      
      const result = await signupWithEmail(formData);
      
      if (result?.error) {
        toastActions.error("Error", result.error);
        
        // Set form errors if they exist (simplified - no longer has details)
        /*if (result.error.details) {
          if (result.error.details.email) {
            signupForm.setError('email', { message: result.error.details.email[0] });
          }
        }*/
      }
      // If no error, the server action will handle the redirect
      
    } catch (error) {
      logger.error('Signup form error:', {error});
      
      // Check if this is a Next.js redirect (not a real error)
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        return // Don't show error toast for redirects
      }
      
      toastActions.error("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking authentication or verifying invitation
  if (isLoading || isAuthenticated || (inviteToken && isVerifyingInvite)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {isAuthenticated 
              ? 'Redirecting to dashboard...' 
              : inviteToken && isVerifyingInvite
              ? 'Verifying your invitation...'
              : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error if invite token is invalid
  if (inviteToken && !isVerifyingInvite && (!isValidInvite || inviteError)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Invalid Invitation</h2>
                <p className="text-gray-600 mt-2">
                  {inviteError || 'This invitation link is invalid or has expired.'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => window.location.href = '/signup'} className="w-full">
                  Continue with Regular Signup
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
                  Go to Homepage
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }



  const isSocialButtonDisabled = isSubmitting || socialLoading.google || socialLoading.facebook;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-xl">
            {inviteToken && isValidInvite && invitation ? 'Join Team' : 'Create your account'}
          </CardTitle>
          <CardDescription>
            {inviteToken && isValidInvite && invitation 
              ? `Create your account to join ${invitation.gym.name}`
              : 'Choose your preferred sign up method'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          
          {/* Invitation Details */}
          {inviteToken && isValidInvite && invitation && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">{invitation.gym.name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">Role:</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium capitalize">
                    {invitation.role}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600">
                  Invited by: <span className="font-medium">{invitation.invited_by.name}</span>
                </div>
                
                {invitation.message && (
                  <div className="mt-3 p-3 bg-white border border-blue-200 rounded text-gray-700 italic text-sm">
                    &ldquo;{invitation.message}&rdquo;
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Social Login Buttons */}
          <div className="grid grid-cols-1 gap-4">
            <SocialButton
              provider="google"
              onClick={() => handleSocialLogin('google')}
              isLoading={socialLoading.google}
              disabled={isSocialButtonDisabled}
              hasInvitation={!!(inviteToken && isValidInvite && invitation)}
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
                ) : inviteToken && isValidInvite && invitation ? (
                  "Create Account & Accept Invitation"
                ) : (
                  "Sign up with Email"
                )}
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link 
              href={`/login${inviteToken ? `?invite=${inviteToken}` : ''}`} 
              className="underline hover:text-primary"
            >
              {inviteToken ? 'Log in to accept invitation' : 'Log in here'}
            </Link>
          </div>

          {!inviteToken && (
            <div className="mt-2 text-center text-sm">
              <Link href="/" className="underline hover:text-primary">
                Go to home page
              </Link>
            </div>
          )}
          
          {inviteToken && isValidInvite && invitation && (
            <div className="mt-4 text-center text-sm text-gray-600">
              <p>By creating an account, you&apos;ll automatically accept the invitation to join {invitation.gym.name}.</p>
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
