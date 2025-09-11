
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
} from 'lucide-react';
import { Scorecard, type Kpi } from './scorecard';
import type { FilterStatus } from '@/app/page';

interface ScorecardInfo {
    value?: number;
    kpis?: Kpi[];
    footerText?: string;
    errorCount?: number;
}

export interface ScorecardData {
  overview: ScorecardInfo;
  pvStatus: ScorecardInfo;
  awbStatus: ScorecardInfo;
  logisticsStatus: ScorecardInfo;
  inTransit: ScorecardInfo;
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
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
      <Scorecard
        title="Overview"
        kpis={counts.overview.kpis}
        icon={Box}
        onClick={() => setActiveFilter('Total')}
        isActive={isFilterActive('Total', 'Recipients', 'Shipments', 'Inventory', 'Instructions')}
        activeKpiLabel={getActiveKpiLabel({ 'Recipients': 'Recipients', 'Shipments': 'Shipments', 'Inventory': 'Inventories', 'Instructions': 'Instructions' })}
        onKpiClick={(label) => {
            if (label === 'Recipients') setActiveFilter('Recipients');
            if (label === 'Shipments') setActiveFilter('Shipments');
            if (label === 'Inventories') setActiveFilter('Inventory');
            if (label === 'Instructions') setActiveFilter('Instructions');
        }}
      />
       <Scorecard
        title="PV Status"
        kpis={counts.pvStatus.kpis}
        icon={FileCheck2}
        onClick={() => setActiveFilter('Total')}
        isActive={isFilterActive('PVNew', 'PVQueued', 'PVGenerated')}
        activeKpiLabel={getActiveKpiLabel({ 'PVNew': 'New', 'PVQueued': 'Queued', 'PVGenerated': 'Generated' })}
        onKpiClick={(label) => {
            if (label === 'New') setActiveFilter('PVNew');
            if (label === 'Queued') setActiveFilter('PVQueued');
            if (label === 'Generated') setActiveFilter('PVGenerated');
        }}
       />
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

      <div className="lg:col-span-2">
        <Scorecard
          title="In Transit"
          value={counts.inTransit.value}
          kpis={inTransitKpisWithIcons}
          icon={Truck}
          onClick={() => setActiveFilter('InTransit')}
          isActive={isFilterActive('InTransit', ...(counts.inTransit.kpis?.map(k => k.label) || []))}
          onKpiClick={(label) => {
              setActiveFilter(label as FilterStatus);
          }}
          activeKpiLabel={isFilterActive('InTransit', ...(counts.inTransit.kpis?.map(k => k.label) || [])) ? activeFilter as string : undefined}
          layout="badges"
        />
      </div>
       <div className="lg:col-span-2">
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
