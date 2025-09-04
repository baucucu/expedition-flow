

"use client";

import React from 'react';
import {
  Box,
  FileCheck2,
  Hourglass,
  Send,
  Truck,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  PackageX,
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
  issues: ScorecardInfo;
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
    "Intrare in agentie": 'IntrareAgentie',
    "Iesire din agentie": 'IesireAgentie',
    "In livrare la curier": 'InLivrare',
    "Redirectionare Home Delivery": 'RedirectionareHome',
    "Redirect Home to OOH": 'RedirectOOH',
    "Incarcat in OOH": 'IncarcatInOOH',
    "Depozitare": 'Depozitare',
  };

  const getActiveInTransitKpiLabel = () => {
    for (const [label, filter] of Object.entries(inTransitFilterMapping)) {
      if (activeFilter === filter) {
        return label;
      }
    }
    return undefined;
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
        isActive={isFilterActive('LogisticsNotReady', 'LogisticsReady', 'EmailQueued', 'Sent', 'AwbNeedsUpdate')}
        activeKpiLabel={getActiveKpiLabel({ 'LogisticsNotReady': 'Not Ready', 'LogisticsReady': 'Ready', 'EmailQueued': 'Queued', 'Sent': 'Sent', 'AwbNeedsUpdate': 'To be updated' })}
        onKpiClick={(label) => {
            if (label === 'Not Ready') setActiveFilter('LogisticsNotReady');
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
          kpis={counts.inTransit.kpis}
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
        />
      </div>
       <Scorecard
        title="Delivered & Completed"
        kpis={counts.deliveredAndCompleted.kpis}
        iconMapping={{ 'Delivered': PackageCheck, 'Not Delivered': PackageX, 'Completed': CheckCircle2 }}
        onClick={() => setActiveFilter('Total')}
        isActive={isFilterActive('Delivered', 'NotDelivered', 'Completed')}
        onKpiClick={(label) => {
          if (label === 'Delivered') setActiveFilter('Delivered');
          if (label === 'Not Delivered') setActiveFilter('NotDelivered');
          if (label === 'Completed') setActiveFilter('Completed');
        }}
        activeKpiLabel={getActiveKpiLabel({ 'Delivered': 'Delivered', 'NotDelivered': 'Not Delivered', 'Completed': 'Completed' })}
        className="lg:col-span-1"
      />
      <Scorecard
        title="Issues"
        value={counts.issues.value}
        kpis={counts.issues.kpis}
        icon={AlertTriangle}
        onClick={() => setActiveFilter('Issues')}
        isActive={isFilterActive('Issues', 'Avizat', 'Ridicare ulterioara')}
        variant="destructive"
        onKpiClick={(label) => {
            if (label === 'Avizat') setActiveFilter('Avizat');
            if (label === 'Ridicare ulterioara') setActiveFilter('Ridicare ulterioara');
        }}
        activeKpiLabel={getActiveKpiLabel({ 'Avizat': 'Avizat', 'Ridicare ulterioara': 'Ridicare ulterioara'})}
        className="lg:col-span-1"
      />
    </div>
  );
};

    
