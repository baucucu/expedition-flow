
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Box, FilePlus2, Hourglass, ThumbsUp, AlertTriangle, PackageCheck, PackageSearch, PackageX, RotateCcw } from "lucide-react";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { mockExpeditions } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import type { ExpeditionStatus } from "@/types";

const statusConfig: { [key in ExpeditionStatus]: { icon: React.FC<any>, color: string } } = {
  New: { icon: FilePlus2, color: "hsl(var(--chart-1))" },
  "Documents Generated": { icon: Hourglass, color: "hsl(var(--chart-2))" },
  "AWB Generated": { icon: Hourglass, color: "hsl(var(--chart-2))" },
  "In Transit": { icon: PackageSearch, color: "hsl(var(--chart-3))" },
  Delivered: { icon: PackageCheck, color: "hsl(var(--chart-4))" },
  Completed: { icon: ThumbsUp, color: "hsl(var(--chart-5))" },
  Canceled: { icon: PackageX, color: "hsl(var(--destructive))" },
  "Lost or Damaged": { icon: AlertTriangle, color: "hsl(var(--destructive))" },
  Returned: { icon: RotateCcw, color: "hsl(var(--muted-foreground))" },
};


export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const expeditionData = useMemo(() => {
    const statusCounts: { [key in ExpeditionStatus]?: number } = {};
    for (const exp of mockExpeditions) {
      statusCounts[exp.status] = (statusCounts[exp.status] || 0) + 1;
    }

    const chartData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name as ExpeditionStatus,
      value: value || 0,
      fill: statusConfig[name as ExpeditionStatus]?.color || "hsl(var(--primary))",
    }));

    const totalExpeditions = mockExpeditions.length;
    const completed = statusCounts["Completed"] || 0;
    const inProgress = totalExpeditions - completed - (statusCounts["New"] || 0) - (statusCounts["Canceled"] || 0) - (statusCounts["Lost or Damaged"] || 0) - (statusCounts["Returned"] || 0);
    const issues = (statusCounts["Canceled"] || 0) + (statusCounts["Lost or Damaged"] || 0) + (statusCounts["Returned"] || 0);

    return {
      total: totalExpeditions,
      new: statusCounts["New"] || 0,
      completed,
      inProgress,
      issues,
      completionPercentage: totalExpeditions > 0 ? (completed / totalExpeditions) * 100 : 0,
      chartData,
    };
  }, []);

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

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Box className="h-6 w-6" />
          <h1 className="text-xl font-bold tracking-tight">Expedition Manager</h1>
        </div>
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="text-primary">Dashboard</Link>
          <Link href="/expeditions" className="text-muted-foreground transition-colors hover:text-foreground">Expeditions</Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign Out</span>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col p-4 md:p-6 gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New Expeditions</CardTitle>
                    <FilePlus2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{expeditionData.new}</div>
                    <p className="text-xs text-muted-foreground">Ready for processing</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                    <Hourglass className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{expeditionData.inProgress}</div>
                    <p className="text-xs text-muted-foreground">Documents or AWB generated</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{expeditionData.completed}</div>
                     <p className="text-xs text-muted-foreground">Successfully delivered and confirmed</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Issues</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{expeditionData.issues}</div>
                    <p className="text-xs text-muted-foreground">Canceled, lost, or returned</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
            <Card className="md:col-span-3">
                <CardHeader>
                    <CardTitle>Expedition Status Breakdown</CardTitle>
                    <CardDescription>A detailed view of all expeditions by their current status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={expeditionData.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <XAxis 
                                dataKey="name" 
                                stroke="#888888"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                             />
                            <YAxis 
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip 
                                cursor={{fill: 'hsla(var(--muted))'}}
                                contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle>Campaign Progress</CardTitle>
                    <CardDescription>
                        {expeditionData.completed} of {expeditionData.total} expeditions completed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                     <Progress value={expeditionData.completionPercentage} aria-label={`${expeditionData.completionPercentage.toFixed(2)}% complete`} />
                     <div className="flex justify-between text-sm font-medium">
                         <span>Total Expeditions:</span>
                         <span>{expeditionData.total}</span>
                     </div>
                     <div className="space-y-2 text-xs text-muted-foreground">
                        {expeditionData.chartData.map(item => {
                            const Icon = statusConfig[item.name]?.icon || Box;
                            return (
                                <div key={item.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-3 h-3" style={{ color: item.fill }}/>
                                        <span>{item.name}</span>
                                    </div>
                                    <span>{item.value}</span>
                                </div>
                            )
                        })}
                     </div>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
