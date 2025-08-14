
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Box, FilePlus2, Hourglass, ThumbsUp, AlertTriangle, PackageCheck, PackageSearch, PackageX, RotateCcw, Send, Truck } from "lucide-react";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { mockExpeditions } from "@/lib/data";
import type { ExpeditionStatus } from "@/types";
import { ExpeditionDashboard } from "@/components/expedition-dashboard";
import { cn } from "@/lib/utils";

const statusConfig: { [key in ExpeditionStatus | 'Total' | 'Issues']: { icon: React.FC<any>, label: string } } = {
  Total: { icon: Box, label: "Total Expeditions" },
  "Documents Generated": { icon: FilePlus2, label: "Docs Generated" },
  "AWB Generated": { icon: Hourglass, label: "AWB Generated" },
  "Sent to Logistics": { icon: Send, label: "Sent to Logistics" },
  "In Transit": { icon: Truck, label: "In Transit" },
  Delivered: { icon: PackageCheck, label: "Delivered" },
  Issues: { icon: AlertTriangle, label: "Issues" },
  Completed: { icon: ThumbsUp, label: "Completed" },
  // These are not primary scorecards but needed for counting
  New: { icon: FilePlus2, label: "New" },
  Canceled: { icon: PackageX, label: "Canceled" },
  "Lost or Damaged": { icon: AlertTriangle, label: "Lost or Damaged" },
  Returned: { icon: RotateCcw, label: "Returned" },
};

type FilterStatus = ExpeditionStatus | 'Total' | 'Issues' | null;


export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('Total');

  const expeditionCounts = useMemo(() => {
    const counts: { [key: string]: number } = {
      Total: mockExpeditions.length,
      Issues: 0,
    };
    
    for (const exp of mockExpeditions) {
      counts[exp.status] = (counts[exp.status] || 0) + 1;
      if (['Canceled', 'Lost or Damaged', 'Returned'].includes(exp.status)) {
        counts['Issues'] = (counts['Issues'] || 0) + 1;
      }
    }
    return counts;
  }, []);

  const filteredExpeditions = useMemo(() => {
    if (!activeFilter || activeFilter === 'Total') {
        return mockExpeditions;
    }
    if (activeFilter === 'Issues') {
        return mockExpeditions.filter(exp => ['Canceled', 'Lost or Damaged', 'Returned'].includes(exp.status));
    }
    return mockExpeditions.filter(exp => exp.status === activeFilter);
  }, [activeFilter]);

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
            <Box className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight">Expedition Manager</h1>
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

  const scorecardOrder: (keyof typeof statusConfig)[] = [
    'Total',
    'Documents Generated',
    'AWB Generated',
    'Sent to Logistics',
    'In Transit',
    'Delivered',
    'Issues',
    'Completed',
  ];

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Box className="h-6 w-6" />
          <h1 className="text-xl font-bold tracking-tight">Expedition Manager</h1>
        </div>
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="text-primary">Dashboard</Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign Out</span>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col p-4 md:p-6 gap-6">
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
            {scorecardOrder.map(key => {
                const Icon = statusConfig[key].icon;
                const label = statusConfig[key].label;
                const count = expeditionCounts[key] || 0;
                const filterKey = key === 'Total' ? 'Total' : key;
                return (
                    <Card 
                        key={key} 
                        onClick={() => setActiveFilter(filterKey as FilterStatus)}
                        className={cn(
                            "cursor-pointer transition-all hover:shadow-md hover:-translate-y-1",
                            activeFilter === filterKey && "ring-2 ring-primary shadow-lg"
                        )}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{label}</CardTitle>
                            <Icon className={cn("h-4 w-4 text-muted-foreground", key === 'Issues' && 'text-destructive')} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{count}</div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>

        <ExpeditionDashboard initialData={filteredExpeditions} />
      </main>
    </div>
  );
}

    