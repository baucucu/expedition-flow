
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { mockExpeditions as initialMockExpeditions } from "@/lib/data";
import type { Expedition, ExpeditionStatus, DocumentType, Recipient } from "@/types";
import { ExpeditionDashboard } from "@/components/expedition-dashboard";
import { DocumentAssistant } from "@/components/document-assistant";
import { EmailComposer } from "@/components/email-composer";
import { ScorecardGrid, type ScorecardData } from "@/components/scorecard-grid";
import { AppHeader } from "@/components/header";
import { Box } from "lucide-react";

export type FilterStatus = ExpeditionStatus | 'Total' | 'Issues' | 'CompletedRecipients' | 'Delivered' | 'Documents Generated' | null;

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

  const scorecardCounts: ScorecardData = useMemo(() => {
    const recipientsWithAllDocsGenerated = allRecipients.filter(r => 
        Object.values(r.documents).every(d => d.status === 'Generated')
    );

    const recipientsWithFailedDocs = allRecipients.filter(r => 
        Object.values(r.documents).some(d => d.status === 'Failed')
    );

    const issuesCount = mockExpeditions.filter(e => ['Canceled', 'Lost or Damaged', 'AWB Generation Failed', 'Email Send Failed'].includes(e.status)).length 
                + recipientsWithFailedDocs.length;
    
    return {
        totalExpeditions: {
            value: mockExpeditions.length,
            footerText: `${allRecipients.length} recipients`
        },
        docsGenerated: {
            value: recipientsWithAllDocsGenerated.length,
            footerText: `${recipientsWithFailedDocs.length} errors`
        },
        awbGenerated: {
            value: mockExpeditions.filter(e => e.status === 'AWB Generated').length,
            footerText: `${mockExpeditions.filter(e => e.status === 'AWB Generation Failed').length} errors`
        },
        sentToLogistics: {
            value: mockExpeditions.filter(e => e.status === 'Sent to Logistics').length,
            footerText: `${mockExpeditions.filter(e => e.status === 'Email Send Failed').length} errors`
        },
        inTransit: {
            value: mockExpeditions.filter(e => e.status === 'In Transit').length,
        },
        delivered: {
            value: allRecipients.filter(r => r.status === 'Delivered').length,
        },
        issues: {
            value: issuesCount,
        },
        completed: {
            value: allRecipients.filter(r => r.status === 'Completed').length,
        }
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
      <AppHeader />
      <main className="flex flex-1 flex-col p-4 md:p-6 gap-6">
        <ScorecardGrid
          counts={scorecardCounts}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
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
