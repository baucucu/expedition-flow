
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ExpeditionDashboard } from "@/components/expedition-dashboard";
import { Button } from "@/components/ui/button";
import { UploadCloud, LogOut } from "lucide-react";
import { AppLogo } from "@/components/icons";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpeditionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  if (loading || !user) {
    return (
       <div className="min-h-screen w-full bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2">
            <AppLogo />
            <h1 className="text-xl font-bold tracking-tight">ExpeditionFlow</h1>
          </div>
        </header>
        <main className="flex flex-1 flex-col p-4 md:p-6">
            <div className="w-full">
                <div className="flex items-center py-4">
                    <Skeleton className="h-10 w-[250px]" />
                </div>
                <div className="rounded-md border">
                    <div className="p-4">
                        <Skeleton className="h-8 w-full mb-4" />
                        <Skeleton className="h-8 w-full mb-4" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                </div>
            </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <AppLogo />
          <h1 className="text-xl font-bold tracking-tight">ExpeditionFlow</h1>
        </div>
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            <a href="/" className="text-muted-foreground transition-colors hover:text-foreground">Dashboard</a>
            <a href="/expeditions" className="text-primary">Expeditions</a>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" />
            Import Expeditions
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign Out</span>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col p-4 md:p-6">
        <ExpeditionDashboard />
      </main>
    </div>
  );
}
