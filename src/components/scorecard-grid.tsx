

"use client";

import React from 'react';
import {
  Box,
  FileCheck2,
  Hourglass,
  Send,
  Truck,
  PackageCheck,
  PackageX,
  Plane,
  AlertCircle,
  Clock,
  Warehouse,
  ArrowRightLeft,
  Package,
  Home,
  ParkingCircle,
  Archive,
  CheckCircle2,
  BadgeCheck,
  File,
} from 'lucide-react';
import { Scorecard, type Kpi } from './scorecard';
import type { FilterStatus } from '@/app/page';

interface ScorecardInfo {
    value?: number;
    secondaryValue?: number;
    kpis?: Kpi[];
    footerText?: string;
    errorCount?: number;
}

export interface ScorecardData {
  overview: ScorecardInfo;
  documentStatus: ScorecardInfo;
  awbStatus: ScorecardInfo;
  logisticsStatus: ScorecardInfo;
  inTransit: ScorecardInfo;
  issues: ScorecardInfo;
  deliveredAndCompleted: ScorecardInfo;
}

interface ScorecardGridProps {
  counts: ScorecardData;
  activeFilter: FilterStatus;
  setActiveFilter: (filter: FilterStatus) => void;
}

export const ScorecardGrid: React.FC<ScorecardGridProps> = ({ counts, activeFilter, setActiveFilter }) => {
  const isFilterActive = (mainFilter: FilterStatus, ...additionalFilters: (FilterStatus | string)[]) => {
    return [mainFilter, ...additionalFilters].includes(activeFilter);
  }
  
  const getActiveKpiLabel = (filterMapping: { [key: string]: string }): string | undefined => {
    if (!activeFilter) return undefined;
    return filterMapping[activeFilter];
  }
  
  const getIconForStatus = (status: string) => {
    const map: Record<string, React.ElementType> = {
        "AWB Emis": Plane,
        "Avizat": AlertCircle,
        "Ridicare ulterioara": Clock,
        "Intrare in HUB": Warehouse,
        "Ridicata de la client": Truck,
        "Iesire din hub": Warehouse,
        "Intrare sorter": ArrowRightLeft,
        "Intrare in agentie": Package,
        "Iesire din agentie": Package,
        "In livrare la curier": Truck,
        "Redirectionare Home Delivery": Home,
        "Redirect Home to OOH": ParkingCircle,
        "Incarcat in OOH": ParkingCircle,
        "Depozitare": Archive,
        "Intrare sorter agentie": ArrowRightLeft,
    }
    return map[status];
  }
  
  const inTransitKpisWithIcons = counts.inTransit.kpis?.map(kpi => ({
      ...kpi,
      icon: getIconForStatus(kpi.label)
  }));


  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      {/* Layer 1 */}
      <Scorecard
        title="Overview"
        kpis={counts.overview.kpis}
        icon={Box}
        onClick={() => setActiveFilter('Total')}
        isActive={isFilterActive('Total', 'OriginalRecipients', 'RegenRecipients', 'OriginalShipments', 'RegenShipments')}
        activeKpiLabel={getActiveKpiLabel({ 'OriginalRecipients': 'Orig. Recip.', 'RegenRecipients': 'Regen. Recip.', 'OriginalShipments': 'Orig. Ship.', 'RegenShipments': 'Regen. Ship.' })}
        onKpiClick={(label) => {
            if (label === 'Orig. Recip.') setActiveFilter('OriginalRecipients');
            if (label === 'Regen. Recip.') setActiveFilter('RegenRecipients');
            if (label === 'Orig. Ship.') setActiveFilter('OriginalShipments');
            if (label === 'Regen. Ship.') setActiveFilter('RegenShipments');
        }}
      />
      <Scorecard
        title="Documents Status"
        kpis={counts.documentStatus.kpis}
        icon={File}
        onClick={() => setActiveFilter('Total')}
        isActive={isFilterActive('PVNew', 'PVQueued', 'PVGenerated', 'Inventory', 'Instructions')}
        activeKpiLabel={getActiveKpiLabel({ 'PVNew': 'PV New', 'PVQueued': 'PV Queued', 'PVGenerated': 'PV Generated', 'Inventory': 'Inventory', 'Instructions': 'Instructions' })}
        onKpiClick={(label) => {
            if (label === 'PV New') setActiveFilter('PVNew');
            if (label === 'PV Queued') setActiveFilter('PVQueued');
            if (label === 'PV Generated') setActiveFilter('PVGenerated');
            if (label === 'Inventory') setActiveFilter('Inventory');
            if (label === 'Instructions') setActiveFilter('Instructions');
        }}
      />

      {/* Layer 2 */}
      <Scorecard
        title="AWB Status"
        kpis={counts.awbStatus.kpis}
        icon={Hourglass}
        onClick={() => setActiveFilter('Total')}
        isActive={isFilterActive('AwbNew', 'AwbQueued', 'AwbGenerated', 'AwbRegenerated')}
        activeKpiLabel={getActiveKpiLabel({ 'AwbNew': 'New', 'AwbQueued': 'Queued', 'AwbGenerated': 'Generated', 'AwbRegenerated': 'Regenerated' })}
        onKpiClick={(label) => {
            if (label === 'New') setActiveFilter('AwbNew');
            if (label === 'Queued') setActiveFilter('AwbQueued');
            if (label === 'Generated') setActiveFilter('AwbGenerated');
            if (label === 'Regenerated') setActiveFilter('AwbRegenerated');
        }}
      />
      <Scorecard
        title="Logistics Status"
        kpis={counts.logisticsStatus.kpis}
        icon={Send}
        onClick={() => setActiveFilter('Total')}
        isActive={isFilterActive('LogisticsReady', 'EmailQueued', 'Sent', 'AwbNeedsUpdate')}
        activeKpiLabel={getActiveKpiLabel({ 'LogisticsReady': 'Ready', 'EmailQueued': 'Queued', 'Sent': 'Sent', 'AwbNeedsUpdate': 'To be updated' })}
        onKpiClick={(label) => {
            if (label === 'Ready') setActiveFilter('LogisticsReady');
            if (label === 'Queued') setActiveFilter('EmailQueued');
            if (label === 'Sent') setActiveFilter('Sent');
            if (label === 'To be updated') setActiveFilter('AwbNeedsUpdate');
        }}
      />

      {/* Layer 3 */}
      <div className="md:col-span-2 flex flex-col md:flex-row gap-4">
        <div className="md:w-2/3">
          <Scorecard
            title="Recipients In Transit"
            value={counts.inTransit.value}
            secondaryValue={counts.inTransit.secondaryValue}
            secondaryValueLabel="AWBs"
            kpis={inTransitKpisWithIcons}
            icon={Truck}
            onClick={() => setActiveFilter('InTransit')}
            isActive={isFilterActive('InTransit', ...(counts.inTransit.kpis?.map(k => k.label) || []))}
            onKpiClick={(label) => {
                setActiveFilter(label as FilterStatus);
            }}
            activeKpiLabel={isFilterActive('InTransit', ...(counts.inTransit.kpis?.map(k => k.label) || [])) ? activeFilter as string : undefined}
            layout="badges"
            className="h-full"
          />
        </div>
        <div className="md:w-1/3">
           <Scorecard
            title="Recipients with Issues"
            value={counts.issues.value}
            secondaryValue={counts.issues.secondaryValue}
            secondaryValueLabel="AWBs"
            kpis={counts.issues.kpis}
            icon={AlertCircle}
            onClick={() => setActiveFilter('Issues')}
            isActive={isFilterActive('Issues', ...(counts.issues.kpis?.map(k => k.label) || []))}
            onKpiClick={(label) => {
                setActiveFilter(label as FilterStatus);
            }}
            activeKpiLabel={isFilterActive('Issues', ...(counts.issues.kpis?.map(k => k.label) || [])) ? activeFilter as string : undefined}
            layout="badges"
            variant="destructive"
            className="h-full"
          />
        </div>
      </div>
       <div className="md:col-span-2">
        <Scorecard
            title="Delivered & Completed"
            kpis={counts.deliveredAndCompleted.kpis}
            iconMapping={{ 
                'Returns': PackageX, 
                'Delivered AWBs': PackageCheck, 
                'Delivered Parcels': PackageCheck,
                'Not Completed': PackageX, 
                'Completed': CheckCircle2, 
                'Not Verified': AlertCircle,
                'Verified': BadgeCheck,
            }}
            onClick={() => setActiveFilter('Total')}
            isActive={isFilterActive('Returns', 'Delivered', 'NotCompleted', 'Completed', 'Verified', 'NotVerified')}
            onKpiClick={(label) => {
                if (label === 'Returns') setActiveFilter('Returns');
                if (label === 'Delivered AWBs') setActiveFilter('Delivered');
                if (label === 'Delivered Parcels') setActiveFilter('Delivered');
                if (label === 'Not Completed') setActiveFilter('NotCompleted');
                if (label === 'Completed') setActiveFilter('Completed');
                if (label === 'Verified') setActiveFilter('Verified');
                if (label === 'Not Verified') setActiveFilter('NotVerified');
            }}
            activeKpiLabel={getActiveKpiLabel({ 
                'Returns': 'Returns', 
                'Delivered': 'Delivered AWBs', 
                'Not Completed': 'Not Completed', 
                'Completed': 'Completed', 
                'Verified': 'Verified',
                'NotVerified': 'Not Verified' 
            })}
        />
       </div>
    </div>
  );
};

    