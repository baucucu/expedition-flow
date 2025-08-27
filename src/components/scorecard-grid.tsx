
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
  Users,
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
  totalExpeditions: ScorecardInfo;
  docsGenerated: ScorecardInfo;
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
  const isFilterActive = (mainFilter: FilterStatus, errorFilter?: FilterStatus) => {
    return activeFilter === mainFilter || activeFilter === errorFilter;
  }
  
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* --- Top Row: Preparation & Hand-off --- */}
      <Scorecard
        title="Total Shipments"
        value={counts.totalExpeditions.value}
        icon={Box}
        footerText={counts.totalExpeditions.footerText}
        footerIcon={Users}
        onClick={() => setActiveFilter('Total')}
        isActive={activeFilter === 'Total'}
      />
       <Scorecard
        title="Docs Generated"
        kpis={counts.docsGenerated.kpis}
        icon={FileCheck2}
        onClick={() => setActiveFilter('Total')} // Main card click can be neutral
        isActive={isFilterActive('PV') || isFilterActive('Inventory') || isFilterActive('Instructions')}
        onKpiClick={(label) => {
            if (label === 'PVs') setActiveFilter('PV');
            if (label === 'Inventories') setActiveFilter('Inventory');
            if (label === 'Instructions') setActiveFilter('Instructions');
        }}
       />
      <Scorecard
        title="AWB Generated"
        value={counts.awbGenerated.value}
        icon={Hourglass}
        footerText={counts.awbGenerated.footerText}
        footerIcon={AlertTriangle}
        errorCount={counts.awbGenerated.errorCount}
        onClick={() => setActiveFilter('AWB Generated')}
        onFooterClick={() => setActiveFilter('AwbFailed')}
        isActive={isFilterActive('AWB Generated', 'AwbFailed')}
        isFooterActive={activeFilter === 'AwbFailed'}
      />
      <Scorecard
        title="Sent to Logistics"
        value={counts.sentToLogistics.value}
        icon={Send}
        footerText={counts.sentToLogistics.footerText}
        footerIcon={AlertTriangle}
        errorCount={counts.sentToLogistics.errorCount}
        onClick={() => setActiveFilter('Sent to Logistics')}
        onFooterClick={() => setActiveFilter('EmailFailed')}
        isActive={isFilterActive('Sent to Logistics', 'EmailFailed')}
        isFooterActive={activeFilter === 'EmailFailed'}
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
        onClick={() => setActiveFilter('CompletedRecipients')}
        isActive={activeFilter === 'CompletedRecipients'}
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
