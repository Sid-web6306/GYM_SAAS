// src/app/(app)/dashboard/page.tsx
'use client' // We'll make it a client component to handle the toast

import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from 'lucide-react';

const DashboardPage = () => {
  const searchParams = useSearchParams();

  // This useEffect will show the "Welcome back!" toast on login
  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      toast.success("Logged In", {
        description: message,
      });
    }
  }, [searchParams]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {`An overview of your gym's activity.`}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              0 {/* We will make this dynamic later */}
            </div>
            <p className="text-xs text-muted-foreground">
              +0 from last month
            </p>
          </CardContent>
        </Card>
        {/* We can add more placeholder stat cards here */}
      </div>
    </div>
  );
};

export default DashboardPage;
