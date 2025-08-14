
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Box, FilePlus2, Hourglass, ThumbsUp, AlertTriangle, PackageCheck, PackageSearch, PackageX, RotateCcw, Send, Truck } from "lucide-react";
import { auth } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockExpeditions as initialMockExpeditions } from "@/lib/data";
import type { Expedition, ExpeditionStatus, DocumentType, Recipient } from "@/types";
import { ExpeditionDashboard } from "@/components/expedition-dashboard";
import { cn } from "@/lib/utils";
import { DocumentAssistant } from "@/components/document-assistant";
import { EmailComposer } from "@/components/email-composer";

const statusConfig: { [key in ExpeditionStatus | 'Total' | 'Issues' | 'CompletedRecipients' | 'Delivered']: { icon: React.FC<any>, label: string } } = {
  Total: { icon: Box, label: "Total Expeditions" },
  "Documents Generated": { icon: FilePlus2, label: "Docs Ready" },
  "AWB Generated": { icon: Hourglass, label: "AWB Ready" },
  "Sent to Logistics": { icon: Send, label: "In Logistics" },
  "In Transit": { icon: Truck, label: "In Transit" },
  "Delivered": { icon: PackageCheck, label: "Delivered" },
  Issues: { icon: AlertTriangle, label: "Issues" },
  CompletedRecipients: { icon: ThumbsUp, label: "Recipients Done" },
  New: { icon: FilePlus2, label: "New" },
  "Ready for Logistics": { icon: PackageSearch, label: "Ready" },
  Canceled: { icon: PackageX, label: "Canceled" },
  "Lost or Damaged": { icon: PackageX, label: "Lost/Damaged" },
};

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

  const expeditionCounts = useMemo(() => {
    const recipientDocsGenerated = allRecipients.filter(r => r.status === 'Documents Generated').length;
    const awbGenerated = mockExpeditions.filter(e => e.status === 'AWB Generated').length;
    const sentToLogistics = mockExpeditions.filter(e => e.status === 'Sent to Logistics').length;
    const inTransit = mockExpeditions.filter(e => e.status === 'In Transit').length;
    const delivered = allRecipients.filter(r => r.status === 'Delivered').length;
    const issues = mockExpeditions.filter(e => ['Canceled', 'Lost or Damaged'].includes(e.status)).length;
    const completedRecipients = allRecipients.filter(r => r.status === 'Completed').length;

    return {
      Total: mockExpeditions.length,
      "Documents Generated": recipientDocsGenerated,
      "AWB Generated": awbGenerated,
      "Sent to Logistics": sentToLogistics,
      "In Transit": inTransit,
      "Delivered": delivered,
      "Issues": issues,
      "CompletedRecipients": completedRecipients,
    };
  }, [allRecipients, mockExpeditions]);

  const filteredRecipients = useMemo(() => {
    if (!activeFilter || activeFilter === 'Total') return allRecipients;
    if (activeFilter === 'Issues') {
      const issueExpeditionIds = mockExpeditions.filter(e => ['Canceled', 'Lost or Damaged'].includes(e.status)).map(e => e.id);
      return allRecipients.filter(r => issueExpeditionIds.includes(r.expeditionId));
    }
    if (activeFilter === 'CompletedRecipients') return allRecipients.filter(r => r.status === 'Completed');
    if (activeFilter === 'Delivered') return allRecipients.filter(r => r.status === 'Delivered');
    if (activeFilter === 'Documents Generated') return allRecipients.filter(r => r.status === 'Documents Generated');

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

  const handleGenerateAWB = (expeditionId: string) => {
    setMockExpeditions(prev => prev.map(exp => 
      exp.id === expeditionId ? { ...exp, status: 'AWB Generated', awb: `AWB-${Date.now()}` } : exp
    ));
  };
  
  const handleManageDocuments = (expedition: Expedition) => {
    setSelectedExpedition(expedition);
    setIsDocAssistantOpen(true);
  };

  const handlePrepareEmail = (expedition: Expedition) => {
    setSelectedExpedition(expedition);
    setIsEmailComposerOpen(true);
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

  const scorecardOrder: (keyof typeof expeditionCounts)[] = [
    'Total',
    'Documents Generated',
    'AWB Generated',
    'Sent to Logistics',
    'In Transit',
    'Delivered',
    'Issues',
    'CompletedRecipients',
  ];

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
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
            {scorecardOrder.map(key => {
                const Icon = statusConfig[key as keyof typeof statusConfig]?.icon || Box;
                const label = statusConfig[key as keyof typeof statusConfig]?.label || key;
                const count = expeditionCounts[key] || 0;
                const filterKey = key as FilterStatus;
                return (
                    <Card 
                        key={key} 
                        onClick={() => setActiveFilter(filterKey)}
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

        <ExpeditionDashboard 
            initialData={filteredRecipients} 
            expeditions={mockExpeditions}
            onGenerateAWB={handleGenerateAWB}
            onManageDocuments={handleManageDocuments}
            onPrepareEmail={handlePrepareEmail}
            onSendToLogistics={handleSendToLogistics}
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
