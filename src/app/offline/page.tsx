import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full border-2">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-muted rounded-full p-4 mb-4 w-fit">
                        <WifiOff className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-2xl">You're Offline</CardTitle>
                    <CardDescription>
                        It seems you've lost your internet connection.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 pt-4">
                    <p className="text-center text-sm text-muted-foreground">
                        Please checks your connection and try again. Some features may not be available while you are offline.
                    </p>
                    <div className="flex gap-2 w-full">
                        <Button asChild className="w-full" variant="default">
                            <Link href="/">Try Again</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
