
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
  const isFilterActive = (mainFilter: FilterStatus, ...additionalFilters: FilterStatus[]) => {
    return [mainFilter, ...additionalFilters].includes(activeFilter);
  }
  
  const getActiveKpiLabel = (filterMapping: { [key: string]: string }): string | undefined => {
    if (!activeFilter) return undefined;
    return filterMapping[activeFilter];
  }
  
  const inTransitFilterMapping: { [key: string]: FilterStatus } = {
    "AWB Emis": 'AwbEmis',
    "Ridicata de la client": 'RidicataClient',
    "Alocata pentru ridicare": 'AlocataRidicare',
    "Intrare sorter": 'IntrareSorter',
    "Iesire din hub": 'IesireHub',
    "Intrare in HUB": 'IntrareInHUB',
    "Intrare in agentie": 'IntrareAgentie',
    "Iesire din agentie": 'IesireAgentie',
    "In livrare la curier": 'InLivrare',
    "Redirectionare Home Delivery": 'RedirectionareHome',
    "Redirect Home to OOH": 'RedirectOOH',
    "Incarcat in OOH": 'IncarcatInOOH',
    "Depozitare": 'Depozitare',
    "Avizat": 'Avizat',
    "Ridicare ulterioara": 'Ridicare ulterioara',
  };

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
    }
    return map[status];
  }

  const getActiveInTransitKpiLabel = () => {
    for (const [label, filter] of Object.entries(inTransitFilterMapping)) {
      if (activeFilter === filter) {
        return label;
      }
    }
    return undefined;
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
        isActive={isFilterActive('AwbNew', 'AwbQueued', 'AwbGenerated')}
        activeKpiLabel={getActiveKpiLabel({ 'AwbNew': 'New', 'AwbQueued': 'Queued', 'AwbGenerated': 'Generated' })}
        onKpiClick={(label) => {
            if (label === 'New') setActiveFilter('AwbNew');
            if (label === 'Queued') setActiveFilter('AwbQueued');
            if (label === 'Generated') setActiveFilter('AwbGenerated');
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
          isActive={isFilterActive('InTransit', ...Object.values(inTransitFilterMapping))}
          onKpiClick={(label) => {
              const filter = inTransitFilterMapping[label];
              if (filter) {
                  setActiveFilter(filter);
              }
          }}
          activeKpiLabel={getActiveInTransitKpiLabel()}
          layout="badges"
        />
      </div>
       <div className="lg:col-span-2">
        <Scorecard
            title="Delivered & Completed"
            kpis={counts.deliveredAndCompleted.kpis}
            iconMapping={{ 'Delivered': PackageCheck, 'Not Completed': PackageX, 'Completed': CheckCircle2 }}
            onClick={() => setActiveFilter('Total')}
            isActive={isFilterActive('Delivered', 'NotCompleted', 'Completed')}
            onKpiClick={(label) => {
                if (label === 'Delivered') setActiveFilter('Delivered');
                if (label === 'Not Completed') setActiveFilter('NotCompleted');
                if (label === 'Completed') setActiveFilter('Completed');
            }}
            activeKpiLabel={getActiveKpiLabel({ 'Delivered': 'Delivered', 'NotCompleted': 'Not Completed', 'Completed': 'Completed' })}
        />
       </div>
    </div>
  );
};

    
