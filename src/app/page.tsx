
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Expedition, ExpeditionStatus, Recipient, AWB, DocumentStatus, EmailStatus, ExpeditionStatusInfo } from "@/types";
import { ExpeditionDashboard } from "@/components/expedition-dashboard/index";
import { ScorecardGrid, type ScorecardData } from "@/components/scorecard-grid";
import { AppHeader } from "@/components/header";
import { Box } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export type FilterStatus = ExpeditionStatus | 'Total' | 'Issues' | 'Completed' | 'Delivered' | 'PVGenerated' | 'PVQueued' | 'PVNew' | 'Inventory' | 'Instructions' | 'DocsFailed' | 'AwbFailed' | 'EmailFailed' | 'NewRecipient' | 'Returned' | 'Sent' | 'EmailQueued' | 'LogisticsNotReady' | 'LogisticsReady' | 'AwbNew' | 'AwbQueued' | 'AwbGenerated' | 'AwbNeedsUpdate' | 'Recipients' | 'Shipments' | 'Avizat' | 'Ridicare ulterioara' | 'AwbEmis' | 'AlocataRidicare' | 'RidicataClient' | 'IntrareSorter' | 'IesireHub' | 'IntrareInHUB' | 'IntrareAgentie' | 'IesireAgentie' | 'InLivrare' | 'RedirectionareHome' | 'RedirectOOH' | 'IncarcatInOOH' | 'Depozitare' | 'NotDelivered' | 'IntrareHub' | 'NotCompleted' | 'IntrareSorterAgentie' | 'Verified' | 'NotVerified' | 'Returns' | 'InTransit' | null;

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('Total');
  const [pvFilter, setPvFilter] = useState<'all' | 'has_pv' | 'no_pv'>('all');
  const [emailFilter, setEmailFilter] = useState<'all' | 'sent' | 'not_sent'>('all');
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [awbs, setAwbs] = useState<AWB[]>([]);
  const [loading, setLoading] = useState(true);
  const [gdprMode, setGdprMode] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const shipmentsQuery = query(collection(db, "shipments"));
    const shipmentsUnsubscribe = onSnapshot(shipmentsQuery, (querySnapshot) => {
        const shipmentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expedition));
        setExpeditions(shipmentsData);
    });

    const recipientsQuery = query(collection(db, "recipients"));
    const recipientsUnsubscribe = onSnapshot(recipientsQuery, (querySnapshot) => {
        const recipientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipient));
        setRecipients(recipientsData);
    });

    const awbsQuery = query(collection(db, "awbs"));
    const awbsUnsubscribe = onSnapshot(awbsQuery, (querySnapshot) => {
        const awbsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AWB));
        setAwbs(awbsData);
    });
    
    setLoading(false);

    return () => {
        shipmentsUnsubscribe();
        recipientsUnsubscribe();
        awbsUnsubscribe();
    };
  }, [user]);
  

  const allRecipientsWithFullData = useMemo(() => {
    if (!recipients.length || !expeditions.length || !awbs.length) return [];
    
    const expeditionsMap = new Map(expeditions.map(exp => [exp.id, exp]));
    const awbsMap = new Map(awbs.map(awb => [awb.id, awb]));

    return recipients.map(rec => {
        const expedition = expeditionsMap.get(rec.shipmentId!);
        const awb = awbsMap.get(rec.awbId);
        
        let awbStatus: DocumentStatus = 'Not Generated';
        if (awb?.status === 'Generated' || awb?.status === 'AWB_CREATED') {
            awbStatus = 'Generated';
        } else if (awb?.status === 'Failed') {
            awbStatus = 'Failed';
        }

        return {
            ...rec,
            expeditionId: expedition?.id || rec.shipmentId,
            expeditionStatus: awb?.expeditionStatus,
            awb: awb,
            awbUrl: awb?.awb_data?.pdfLink,
            awbStatus: awbStatus,
            emailStatus: awb?.emailStatus,
            emailId: awb?.emailId
        };
    });
  }, [recipients, expeditions, awbs]);

  const scorecardCounts: ScorecardData = useMemo(() => {
    const awbNewCount = awbs.filter(e => e.status === 'New').length;
    const awbQueuedCount = awbs.filter(e => e.status === 'Queued').length;
    
    const emailQueuedCount = awbs.filter(e => e.emailStatus === 'Queued').length;
    const emailSentCount = awbs.filter(awb => awb.emailStatus === 'Sent').length;
    
    const awbsToBeUpdatedCount = awbs.filter(awb => awb.awb_data && !awb.expeditionStatus).length;
    
    const pvGeneratedCount = allRecipientsWithFullData.filter(r => r.pvStatus === 'Generated').length;
    const pvQueuedCount = allRecipientsWithFullData.filter(r => r.pvStatus === 'Queued').length;
    const pvNewCount = allRecipientsWithFullData.filter(r => !r.pvUrl).length;
    const instructionsGeneratedCount = allRecipientsWithFullData.filter(r => r.instructionsStatus === 'Generated').length;
    const inventoryGeneratedCount = allRecipientsWithFullData.filter(r => r.inventoryStatus === 'Generated').length;
    const awbGeneratedCount = awbs.filter(awb => !!awb.awb_data?.awbNumber).length;
    
    const deliveredCount = awbs.filter(awb => awb.expeditionStatus?.status === "Livrata cu succes").length;
    
    const notCompletedCount = allRecipientsWithFullData.filter(r => 
        r.awb?.expeditionStatus?.status === "Livrata cu succes" && !r.pvSemnatUrl
    ).length;
    
    const completedCount = allRecipientsWithFullData.filter(r => r.pvStatus === 'Complet').length;
    
    const verifiedCount = allRecipientsWithFullData.filter(r => r.verified === true).length;
    const notVerifiedCount = allRecipientsWithFullData.filter(r => r.pvStatus === 'Complet' && r.verified !== true).length;
    
    const returnsCount = awbs.filter(awb => !!awb.expeditionStatus?.inReturn).length;

    const recipientsByShipment = allRecipientsWithFullData.reduce((acc, recipient) => {
        if (!acc[recipient.shipmentId]) {
            acc[recipient.shipmentId] = [];
        }
        acc[recipient.shipmentId].push(recipient);
        return acc;
    }, {} as Record<string, typeof allRecipientsWithFullData>);

    const awbsByShipment = awbs.reduce((acc, awb) => {
        acc[awb.shipmentId] = awb;
        return acc;
    }, {} as Record<string, AWB>);

    let readyForLogisticsCount = 0;
    const shipmentsWithEmailStatus = new Set(awbs.filter(a => a.emailStatus === 'Queued' || a.emailStatus === 'Sent').map(a => a.shipmentId));

    expeditions.forEach(expedition => {
        if (shipmentsWithEmailStatus.has(expedition.id)) return;

        const shipmentRecipients = recipientsByShipment[expedition.id] || [];
        const shipmentAwb = awbsByShipment[expedition.id];

        const allPvsGenerated = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.pvStatus === 'Generated');
        const allInstructionsSynced = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.instructionsStatus === 'Generated');
        const allInventoriesSynced = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.inventoryStatus === 'Generated');
        const awbIsGenerated = !!shipmentAwb?.awb_data?.awbNumber;
        
        if (allPvsGenerated && allInstructionsSynced && allInventoriesSynced && awbIsGenerated) {
            readyForLogisticsCount++;
        }
    });
    
     const awbByStatus = awbs.reduce((acc, awb) => {
        const status = awb.expeditionStatus?.status;
        if (status) {
            if (!acc[status]) {
                acc[status] = 0;
            }
            acc[status]++;
        }
        return acc;
    }, {} as Record<string, number>);

    const finalStatuses = ["Livrata cu succes"];
    const returnStatuses = awbs.filter(awb => !!awb.expeditionStatus?.inReturn).map(awb => awb.expeditionStatus!.status);
    const excludedStatuses = new Set([...finalStatuses, ...returnStatuses, undefined, null]);

    const dynamicInTransitCounts = Object.entries(awbByStatus)
        .filter(([status, count]) => !excludedStatuses.has(status) && count > 0)
        .map(([status, count]) => {
            let color = 'yellow';
            if (status === 'AWB Emis') color = 'blue';
            if (['Avizat', 'Ridicare ulterioara'].includes(status)) color = 'red';
            return {
                label: status,
                value: count,
                color: color,
            };
        })
        .sort((a, b) => b.value - a.value);

    let totalInTransit = dynamicInTransitCounts.reduce((acc, curr) => acc + curr.value, 0);

    return {
        overview: {
            kpis: [
                { value: allRecipientsWithFullData.length, label: 'Recipients' },
                { value: expeditions.length, label: 'Shipments' },
                { value: inventoryGeneratedCount, label: 'Inventories' },
                { value: instructionsGeneratedCount, label: 'Instructions' },
            ]
        },
        pvStatus: {
            kpis: [
                { value: pvNewCount, label: 'New' },
                { value: pvQueuedCount, label: 'Queued' },
                { value: pvGeneratedCount, label: 'Generated' },
            ]
        },
        awbStatus: {
            kpis: [
                { value: awbNewCount, label: 'New' },
                { value: awbQueuedCount, label: 'Queued' },
                { value: awbGeneratedCount, label: 'Generated' },
            ]
        },
        logisticsStatus: {
            kpis: [
                { value: readyForLogisticsCount, label: 'Ready' },
                { value: emailQueuedCount, label: 'Queued' },
                { value: emailSentCount, label: 'Sent' },
                { value: awbsToBeUpdatedCount, label: 'To be updated' },
            ]
        },
        inTransit: {
            value: totalInTransit,
            kpis: dynamicInTransitCounts,
        },
        deliveredAndCompleted: {
            kpis: [
                { value: returnsCount, label: 'Returns' },
                { value: deliveredCount, label: 'Delivered' },
                { value: notCompletedCount, label: 'Not Completed' },
                { value: completedCount, label: 'Completed' },
                { value: notVerifiedCount, label: 'Not Verified'},
                { value: verifiedCount, label: 'Verified' },
            ],
        },
    }
  }, [allRecipientsWithFullData, expeditions, awbs]);

  const filteredRecipients = useMemo(() => {
    let filteredData = allRecipientsWithFullData;

    // Main scorecard filter
    if (activeFilter && activeFilter !== 'Total' && activeFilter !== 'Recipients' && activeFilter !== 'Shipments') {
        const filterByAwbStatus = (status: string) => {
            const targetAwbIds = new Set(awbs.filter(awb => awb.expeditionStatus?.status === status).map(awb => awb.id));
            return filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        };

        const finalStatuses = ["Livrata cu succes"];
        const returnStatuses = awbs.filter(awb => !!awb.expeditionStatus?.inReturn).map(awb => awb.expeditionStatus!.status);
        const excludedStatuses = new Set([...finalStatuses, ...returnStatuses, undefined, null]);
        const allInTransitStatuses = Object.keys(awbs.reduce((acc, awb) => {
            if (awb.expeditionStatus?.status && !excludedStatuses.has(awb.expeditionStatus.status)) {
                acc[awb.expeditionStatus.status] = true;
            }
            return acc;
        }, {} as Record<string, boolean>));

        if (activeFilter === 'InTransit') {
            const targetAwbIds = new Set(awbs.filter(awb => allInTransitStatuses.includes(awb.expeditionStatus?.status!)).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        } else if (allInTransitStatuses.includes(activeFilter)) {
            filteredData = filterByAwbStatus(activeFilter);
        } else if (activeFilter === 'NotCompleted') {
            filteredData = filteredData.filter(r => r.awb?.expeditionStatus?.status === "Livrata cu succes" && !r.pvSemnatUrl);
        } else if (activeFilter === 'Verified') {
            filteredData = filteredData.filter(r => r.verified === true);
        } else if (activeFilter === 'NotVerified') {
            filteredData = filteredData.filter(r => r.pvStatus === 'Complet' && r.verified !== true);
        } else if (activeFilter === 'Returns') {
            const targetAwbIds = new Set(awbs.filter(awb => !!awb.expeditionStatus?.inReturn).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        } else if (activeFilter === 'PVGenerated') {
            filteredData = filteredData.filter(r => r.pvStatus === 'Generated');
        } else if (activeFilter === 'PVQueued') {
            filteredData = filteredData.filter(r => r.pvStatus === 'Queued');
        } else if (activeFilter === 'PVNew') {
            filteredData = filteredData.filter(r => !r.pvUrl);
        } else if (activeFilter === 'Inventory') {
            filteredData = filteredData.filter(r => r.inventoryStatus === 'Generated');
        } else if (activeFilter === 'Instructions') {
            filteredData = filteredData.filter(r => r.instructionsStatus === 'Generated');
        } else if (activeFilter === 'DocsFailed') {
            filteredData = filteredData.filter(r => r.pvStatus === 'Failed' || r.inventoryStatus === 'Failed' || r.instructionsStatus === 'Failed');
        } else if (['AwbFailed', 'AwbNew', 'AwbQueued', 'AwbGenerated'].includes(activeFilter)) {
            const statusMap = { 'AwbFailed': 'Failed', 'AwbNew': 'New', 'AwbQueued': 'Queued', 'AwbGenerated': 'Generated' };
            const awbStatus = statusMap[activeFilter as keyof typeof statusMap];
            if (awbStatus === 'Generated') {
                const generatedAwbIds = new Set(awbs.filter(awb => !!awb.awb_data?.awbNumber).map(awb => awb.id));
                filteredData = filteredData.filter(r => r.awbId && generatedAwbIds.has(r.awbId));
            } else {
                const targetAwbIds = new Set(awbs.filter(awb => awb.status === awbStatus).map(awb => awb.id));
                filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
            }
        } else if (activeFilter === 'AwbNeedsUpdate') {
            const targetAwbIds = new Set(awbs.filter(awb => awb.awb_data && !awb.expeditionStatus).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        } else if (['EmailQueued', 'Sent', 'EmailFailed'].includes(activeFilter)) {
            const statusMap = { 'EmailQueued': 'Queued', 'Sent': 'Sent', 'EmailFailed': 'Failed' };
            const emailStatus = statusMap[activeFilter as keyof typeof statusMap];
            const targetAwbIds = new Set(awbs.filter(awb => awb.emailStatus === emailStatus).map(awb => awb.id));
            filteredData = filteredData.filter(r => r.awbId && targetAwbIds.has(r.awbId));
        } else if (activeFilter === 'LogisticsReady') {
            const recipientsByShipment = filteredData.reduce((acc, recipient) => {
                if (!acc[recipient.shipmentId]) acc[recipient.shipmentId] = [];
                acc[recipient.shipmentId].push(recipient);
                return acc;
            }, {} as Record<string, typeof allRecipientsWithFullData>);
            const awbsByShipment = awbs.reduce((acc, awb) => {
                acc[awb.shipmentId] = awb;
                return acc;
            }, {} as Record<string, AWB>);
            const shipmentsWithEmailStatus = new Set(awbs.filter(a => a.emailStatus === 'Queued' || a.emailStatus === 'Sent').map(a => a.shipmentId));
            const targetShipmentIds = expeditions.filter(expedition => {
                if (shipmentsWithEmailStatus.has(expedition.id)) return false;
                const shipmentRecipients = recipientsByShipment[expedition.id] || [];
                const shipmentAwb = awbsByShipment[expedition.id];
                const allPvsGenerated = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.pvStatus === 'Generated');
                const allInstructionsSynced = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.instructionsStatus === 'Generated');
                const allInventoriesSynced = shipmentRecipients.length > 0 && shipmentRecipients.every(r => r.inventoryStatus === 'Generated');
                const awbIsGenerated = !!shipmentAwb?.awb_data?.awbNumber;
                return allPvsGenerated && allInstructionsSynced && allInventoriesSynced && awbIsGenerated;
            }).map(exp => exp.id);
            filteredData = filteredData.filter(r => targetShipmentIds.includes(r.shipmentId));
        } else if (activeFilter === 'Delivered') {
            filteredData = filterByAwbStatus("Livrata cu succes");
        } else if (['NewRecipient', 'Returned'].includes(activeFilter)) {
            const statusMap = { 'NewRecipient': 'New', 'Returned': 'Returned' };
            const recipientStatus = statusMap[activeFilter as keyof typeof statusMap];
            filteredData = filteredData.filter(r => r.status === recipientStatus);
        } else if (activeFilter === 'Completed') {
            filteredData = filteredData.filter(r => r.pvStatus === 'Complet');
        } else {
            const expeditionFilteredIds = expeditions.filter(e => e.status === activeFilter).map(e => e.id);
            filteredData = filteredData.filter(r => expeditionFilteredIds.includes(r.expeditionId!));
        }
    }

    // Toolbar filters
    if (pvFilter === 'has_pv') {
        filteredData = filteredData.filter(r => r.pvUrl);
    } else if (pvFilter === 'no_pv') {
        filteredData = filteredData.filter(r => !r.pvUrl);
    }

    if (emailFilter === 'sent') {
        filteredData = filteredData.filter(r => r.emailStatus === 'Sent');
    } else if (emailFilter === 'not_sent') {
        filteredData = filteredData.filter(r => r.emailStatus !== 'Sent');
    }

    return filteredData;
  }, [activeFilter, pvFilter, emailFilter, allRecipientsWithFullData, expeditions, awbs]);

  if (authLoading || loading || !user) {
    return (
       <div className="min-h-screen w-full bg-background">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Box className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight">Expedition Manager</h1>
          </div>
        </header>
        <main className="flex flex-1 flex-col p-4 md:p-6">
             <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 mb-6">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
            </div>
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
      <AppHeader gdprMode={gdprMode} onGdprModeChange={setGdprMode} />
      <main className="flex flex-1 flex-col p-4 md:p-6 gap-6">
        <ScorecardGrid
          counts={scorecardCounts}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
        <ExpeditionDashboard 
            initialData={filteredRecipients} 
            expeditions={expeditions}
            gdprMode={gdprMode}
            pvFilter={pvFilter}
            setPvFilter={setPvFilter}
            emailFilter={emailFilter}
            setEmailFilter={setEmailFilter}
        />
      </main>
    </div>
  );
}
