// src/components/layout/PageLoader.tsx
import { Loader2 } from 'lucide-react';

export const PageLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      {/* 
        Loader2 is an icon from lucide-react (Shadcn's icon library).
        'animate-spin' is a standard Tailwind CSS utility to make it spin.
        This creates a clean, consistent loading spinner.
      */}
      <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
    </div>
  );
};
