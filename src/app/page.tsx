
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Box, FilePlus2, Hourglass, CheckCircle2, AlertTriangle, Send, Truck, PackageCheck, Users } from "lucide-react";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { mockExpeditions as initialMockExpeditions } from "@/lib/data";
import type { Expedition, ExpeditionStatus, DocumentType, Recipient } from "@/types";
import { ExpeditionDashboard } from "@/components/expedition-dashboard";
import { cn } from "@/lib/utils";
import { DocumentAssistant } from "@/components/document-assistant";
import { EmailComposer } from "@/components/email-composer";

type FilterStatus = ExpeditionStatus | 'Total' | 'Issues' | 'CompletedRecipients' | 'Delivered' | null;

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('Total');
  const [mockExpeditions, setMockExpeditions] = useState(initialMockExpeditions);
  const [isDocAssistantOpen, setIsDocAssistantOpen] = useState(false);
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [selectedExpedition, setSelectedExpedition] = useState<Expedition | null>(null);

  const allRecipients = useMemo(() => mockExpeditions.flatMap(exp => 
    exp.recipients.map(rec => ({ ...rec, expeditionId: exp.id, expeditionStatus: exp.status, awb: exp.awb }))
  ), [mockExpeditions]);

  const scorecardCounts = useMemo(() => {
    const allDocs = allRecipients.flatMap(r => Object.values(r.documents));
    return {
        totalExpeditions: mockExpeditions.length,
        totalRecipients: allRecipients.length,
        docsGenerated: allDocs.filter(d => d.status === 'Generated').length,
        docsFailed: allDocs.filter(d => d.status === 'Failed').length,
        awbGenerated: mockExpeditions.filter(e => e.status === 'AWB Generated').length,
        awbFailed: mockExpeditions.filter(e => e.status === 'AWB Generation Failed').length,
        sentToLogistics: mockExpeditions.filter(e => e.status === 'Sent to Logistics').length,
        inTransit: mockExpeditions.filter(e => e.status === 'In Transit').length,
        delivered: allRecipients.filter(r => r.status === 'Delivered').length,
        issues: mockExpeditions.filter(e => ['Canceled', 'Lost or Damaged', 'AWB Generation Failed', 'Email Send Failed'].includes(e.status)).length 
                + allDocs.filter(d => d.status === 'Failed').length,
        completed: allRecipients.filter(r => r.status === 'Completed').length,
    }
  }, [allRecipients, mockExpeditions]);

  const filteredRecipients = useMemo(() => {
    if (!activeFilter || activeFilter === 'Total') return allRecipients;
    if (activeFilter === 'Issues') {
        const issueExpeditionIds = mockExpeditions
            .filter(e => ['Canceled', 'Lost or Damaged', 'AWB Generation Failed', 'Email Send Failed'].includes(e.status))
            .map(e => e.id);
        const issueRecipientIds = allRecipients
            .filter(r => Object.values(r.documents).some(d => d.status === 'Failed'))
            .map(r => r.id);
        
        return allRecipients.filter(r => issueExpeditionIds.includes(r.expeditionId) || issueRecipientIds.includes(r.id));
    }
    if (activeFilter === 'CompletedRecipients') return allRecipients.filter(r => r.status === 'Completed');
    if (activeFilter === 'Delivered') return allRecipients.filter(r => r.status === 'Delivered');
    if (activeFilter === 'Documents Generated') {
        const recipientIds = allRecipients
            .filter(r => Object.values(r.documents).every(d => d.status === 'Generated'))
            .map(r => r.id);
        return allRecipients.filter(r => recipientIds.includes(r.id));
    }

    const expeditionFilteredIds = mockExpeditions.filter(e => e.status === activeFilter).map(e => e.id);
    return allRecipients.filter(r => expeditionFilteredIds.includes(r.expeditionId));
  }, [activeFilter, allRecipients, mockExpeditions]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const handleSendToLogistics = (expeditionId: string) => {
    setMockExpeditions(prev => prev.map(exp => 
      exp.id === expeditionId ? { ...exp, status: 'Sent to Logistics' } : exp
    ));
  };

  const handleDocumentGenerated = (expeditionId: string, recipientId: string, documentType: DocumentType, content: string) => {
    setMockExpeditions(prevExpeditions => {
        return prevExpeditions.map(exp => {
            if (exp.id !== expeditionId) return exp;

            let allRecipientsDocsGenerated = true;

            const updatedRecipients = exp.recipients.map(rec => {
                if (rec.id !== recipientId) {
                    const allDocsForThisRecipient = Object.values(rec.documents).every(d => d.status === 'Generated');
                    if (!allDocsForThisRecipient) allRecipientsDocsGenerated = false;
                    return rec;
                }

                const updatedDocuments = {
                    ...rec.documents,
                    [documentType]: { status: 'Generated' as const, content, url: '#' }
                };

                const allDocsForThisRecipient = Object.values(updatedDocuments).every(d => d.status === 'Generated');
                if (!allDocsForThisRecipient) allRecipientsDocsGenerated = false;

                return {
                    ...rec,
                    documents: updatedDocuments,
                    status: allDocsForThisRecipient ? 'Documents Generated' as const : rec.status,
                };
            });

            return {
                ...exp,
                recipients: updatedRecipients,
                status: allRecipientsDocsGenerated ? 'Ready for Logistics' as const : exp.status,
            };
        });
    });
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
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Sign Out</span>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col p-4 md:p-6 gap-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
            <Card
                onClick={() => setActiveFilter('Total')}
                className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    activeFilter === 'Total' && "ring-2 ring-primary shadow-lg"
                )}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-12">
                    <CardTitle className="text-sm font-medium">Total Expeditions</CardTitle>
                    <Box className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-16">
                    <div className="text-3xl font-bold">{scorecardCounts.totalExpeditions}</div>
                </CardContent>
                <CardFooter className="h-8 pb-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {scorecardCounts.totalRecipients} recipients
                    </p>
                </CardFooter>
            </Card>

            <Card
                onClick={() => setActiveFilter('Documents Generated')}
                className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    activeFilter === 'Documents Generated' && "ring-2 ring-primary shadow-lg"
                )}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-12">
                    <CardTitle className="text-sm font-medium">Docs Generated</CardTitle>
                    <FilePlus2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-16">
                    <div className="text-3xl font-bold">{scorecardCounts.docsGenerated}</div>
                </CardContent>
                <CardFooter className="h-8 pb-4">
                    <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {scorecardCounts.docsFailed} errors
                    </p>
                </CardFooter>
            </Card>

            <Card
                onClick={() => setActiveFilter('AWB Generated')}
                className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    activeFilter === 'AWB Generated' && "ring-2 ring-primary shadow-lg"
                )}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-12">
                    <CardTitle className="text-sm font-medium">AWB Generated</CardTitle>
                    <Hourglass className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-16">
                    <div className="text-3xl font-bold">{scorecardCounts.awbGenerated}</div>
                </CardContent>
                <CardFooter className="h-8 pb-4">
                    <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {scorecardCounts.awbFailed} errors
                    </p>
                </CardFooter>
            </Card>

            <Card
                onClick={() => setActiveFilter('Sent to Logistics')}
                className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    activeFilter === 'Sent to Logistics' && "ring-2 ring-primary shadow-lg"
                )}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-12">
                    <CardTitle className="text-sm font-medium">Sent to Logistics</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-16">
                    <div className="text-3xl font-bold">{scorecardCounts.sentToLogistics}</div>
                </CardContent>
                 <CardFooter className="h-8 pb-4" />
            </Card>

            <Card
                onClick={() => setActiveFilter('In Transit')}
                className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    activeFilter === 'In Transit' && "ring-2 ring-primary shadow-lg"
                )}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-12">
                    <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-16">
                    <div className="text-3xl font-bold">{scorecardCounts.inTransit}</div>
                </CardContent>
                 <CardFooter className="h-8 pb-4" />
            </Card>

             <Card
                onClick={() => setActiveFilter('Delivered')}
                className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    activeFilter === 'Delivered' && "ring-2 ring-primary shadow-lg"
                )}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-12">
                    <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                    <PackageCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-16">
                    <div className="text-3xl font-bold">{scorecardCounts.delivered}</div>
                </CardContent>
                 <CardFooter className="h-8 pb-4" />
            </Card>

            <Card
                onClick={() => setActiveFilter('Issues')}
                className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    activeFilter === 'Issues' && "ring-2 ring-destructive shadow-lg"
                )}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-12">
                    <CardTitle className="text-sm font-medium">Issues</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent className="h-16">
                    <div className="text-3xl font-bold">{scorecardCounts.issues}</div>
                </CardContent>
                 <CardFooter className="h-8 pb-4" />
            </Card>

            <Card
                onClick={() => setActiveFilter('CompletedRecipients')}
                className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    activeFilter === 'CompletedRecipients' && "ring-2 ring-primary shadow-lg"
                )}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-12">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="h-16">
                    <div className="text-3xl font-bold">{scorecardCounts.completed}</div>
                </CardContent>
                 <CardFooter className="h-8 pb-4" />
            </Card>
        </div>

        <ExpeditionDashboard 
            initialData={filteredRecipients} 
            expeditions={mockExpeditions}
        />
      </main>
      {selectedExpedition && (
        <>
          <DocumentAssistant 
            isOpen={isDocAssistantOpen}
            setIsOpen={setIsDocAssistantOpen}
            expedition={selectedExpedition}
            onDocumentGenerated={handleDocumentGenerated}
          />
          <EmailComposer 
            isOpen={isEmailComposerOpen}
            setIsOpen={setIsEmailComposerOpen}
            expedition={selectedExpedition}
            onEmailSent={handleSendToLogistics}
          />
        </>
      )}
    </div>
  );
}
