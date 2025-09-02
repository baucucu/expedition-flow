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
  awbGenerated: ScorecardInfo;
  sentToLogistics: ScorecardInfo;
  inTransit: ScorecardInfo;
  delivered: ScorecardInfo;
  issues: ScorecardInfo;
  completed: ScorecardInfo;
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
  
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* --- Top Row: Preparation & Hand-off --- */}
      <Scorecard
        title="Overview"
        kpis={counts.overview.kpis}
        icon={Box}
        onClick={() => setActiveFilter('Total')}
        isActive={isFilterActive('Recipients', 'Shipments', 'Inventory', 'Instructions')}
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
        onClick={() => setActiveFilter('Total')} // Main card click can be neutral
        isActive={isFilterActive('PVNew', 'PVQueued', 'PVGenerated')}
        onKpiClick={(label) => {
            if (label === 'New') setActiveFilter('PVNew');
            if (label === 'Queued') setActiveFilter('PVQueued');
            if (label === 'Generated') setActiveFilter('PVGenerated');
        }}
       />
      <Scorecard
        title="AWB Generated"
        value={counts.awbGenerated.value}
        kpis={counts.awbGenerated.kpis}
        icon={Hourglass}
        onClick={() => setActiveFilter('AWB Generated')}
        onKpiClick={(label) => {
            if (label === 'failed') setActiveFilter('AwbFailed');
            if (label === 'new') setActiveFilter('AwbNew');
            if (label === 'queued') setActiveFilter('AwbQueued');
        }}
        isActive={isFilterActive('AWB Generated', 'AwbFailed', 'AwbNew', 'AwbQueued')}
      />
      <Scorecard
        title="Sent to Logistics"
        value={counts.sentToLogistics.value}
        icon={Send}
        onClick={() => setActiveFilter('Sent')}
        isActive={isFilterActive('Sent', 'EmailFailed')}
      />

      {/* --- Bottom Row: Tracking & Completion --- */}
      <Scorecard
        title="In Transit"
        value={counts.inTransit.value}
        icon={Truck}
        onClick={() => setActiveFilter('In Transit')}
        isActive={activeFilter === 'In Transit'}
      />
      <Scorecard
        title="Delivered"
        value={counts.delivered.value}
        icon={PackageCheck}
        onClick={() => setActiveFilter('Delivered')}
        isActive={activeFilter === 'Delivered'}
      />
       <Scorecard
        title="Completed"
        value={counts.completed.value}
        icon={CheckCircle2}
        onClick={() => setActiveFilter('Completed')}
        isActive={activeFilter === 'Completed'}
      />
      <Scorecard
        title="Issues"
        value={counts.issues.value}
        icon={AlertTriangle}
        onClick={() => setActiveFilter('Issues')}
        isActive={activeFilter === 'Issues'}
        variant="destructive"
      />
    </div>
  );
};
