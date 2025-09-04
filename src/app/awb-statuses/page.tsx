
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import type { AWB } from "@/types";
import { unstable_noStore as noStore } from 'next/cache';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppHeader } from "@/components/header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";


async function getAwbStatuses() {
  noStore();
  try {
    const awbsSnapshot = await getDocs(collection(db, "awbs"));
    const awbs = awbsSnapshot.docs.map(doc => doc.data() as AWB);

    const statusCounts: Record<string, number> = {};

    awbs.forEach(awb => {
        const status = awb.expeditionStatus?.status;
        if (status) {
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        } else {
            statusCounts['(Not Set)'] = (statusCounts['(Not Set)'] || 0) + 1;
        }
    });

    const sortedStatuses = Object.entries(statusCounts).sort(([, a], [, b]) => b - a);

    return { statuses: sortedStatuses };
  } catch (error) {
    console.error("Failed to fetch AWB statuses:", error);
    return { statuses: [] };
  }
}

export default async function AwbStatusesPage() {
  const { statuses } = await getAwbStatuses();
  
  return (
    <div className="min-h-screen w-full bg-background">
      <AppHeader />
      <main className="flex flex-1 flex-col p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" asChild>
                <Link href="/">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">AWB Status Audit</h1>
        </div>

        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Unique AWB Expedition Statuses</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Count</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {statuses.map(([status, count]) => (
                                <TableRow key={status}>
                                    <TableCell className="font-medium">{status}</TableCell>
                                    <TableCell className="text-right">{count}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
