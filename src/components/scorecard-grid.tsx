
"use client";

import React from 'react';
import {
  Box,
  FilePlus2,
  Hourglass,
  Send,
  Truck,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Scorecard } from './scorecard';
import type { FilterStatus } from '@/app/page';

interface ScorecardInfo {
    value: number;
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
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
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
        value={counts.docsGenerated.value}
        icon={FilePlus2}
        footerText={counts.docsGenerated.footerText}
        footerIcon={AlertTriangle}
        errorCount={counts.docsGenerated.errorCount}
        onClick={() => setActiveFilter('Documents Generated')}
        onFooterClick={() => setActiveFilter('DocsFailed')}
        isActive={isFilterActive('Documents Generated', 'DocsFailed')}
        isFooterActive={activeFilter === 'DocsFailed'}
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
        title="Issues"
        value={counts.issues.value}
        icon={AlertTriangle}
        onClick={() => setActiveFilter('Issues')}
        isActive={activeFilter === 'Issues'}
        variant="destructive"
      />
      <Scorecard
        title="Completed"
        value={counts.completed.value}
        icon={CheckCircle2}
        onClick={() => setActiveFilter('CompletedRecipients')}
        isActive={activeFilter === 'CompletedRecipients'}
      />
    </div>
  );
};
