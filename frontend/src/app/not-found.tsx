import Link from "next/link";
import { AlertCircle, Home, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="max-w-md w-full animate-fade-in-up">
        <CardContent className="pt-12 pb-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-6">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">404</h1>
            <h2 className="text-2xl font-semibold">Page Not Found</h2>
            <p className="text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild size="lg">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/yields">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Yields
              </Link>
            </Button>
          </div>

          {/* Additional Info */}
          <div className="pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Need help? Check our{" "}
              <Link href="/" className="text-primary hover:underline">
                Dashboard
              </Link>{" "}
              or visit the{" "}
              <Link href="/vault" className="text-primary hover:underline">
                Vault
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
