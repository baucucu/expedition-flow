

"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

export interface Kpi {
  value: number;
  secondaryValue?: number;
  label: string;
  color?: string;
  icon?: React.ElementType;
}

interface ScorecardProps {
  title: string;
  value?: number;
  secondaryValue?: number;
  secondaryValueLabel?: string;
  kpis?: Kpi[];
  icon?: React.ElementType;
  iconMapping?: Record<string, React.ElementType>;
  onClick: () => void;
  onKpiClick?: (label: string) => void;
  isActive: boolean;
  activeKpiLabel?: string;
  variant?: 'default' | 'destructive';
  layout?: 'default' | 'badges';
  className?: string;
}

export const Scorecard: React.FC<ScorecardProps> = ({
  title,
  value,
  secondaryValue,
  secondaryValueLabel,
  kpis,
  icon: Icon,
  iconMapping,
  onClick,
  onKpiClick,
  isActive,
  activeKpiLabel,
  variant = 'default',
  layout = 'default',
  className,
}) => {
  const ringClass = variant === 'destructive' ? "ring-destructive" : "ring-primary";

  const handleKpiClick = (e: React.MouseEvent, label: string) => {
    if (onKpiClick) {
        e.stopPropagation();
        onKpiClick(label);
    }
  }

  const hasKpis = kpis && kpis.length > 0;
  const showValue = value !== undefined;
  
  const badgeColorClasses: Record<string, string> = {
    red: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  }

  const renderDefaultKpis = () => (
     <div className="flex w-full items-start justify-around flex-nowrap gap-2">
        {kpis!.map((kpi, index) => {
            const isKpiActive = isActive && activeKpiLabel === kpi.label;
            const KpiIcon = iconMapping ? iconMapping[kpi.label] : null;
            
            return (
                <React.Fragment key={kpi.label}>
                    <div 
                        className={cn(
                            "text-center p-1 rounded-md transition-colors w-full", 
                            onKpiClick && "cursor-pointer hover:bg-accent",
                            isKpiActive && 'bg-muted'
                        )}
                        onClick={(e) => handleKpiClick(e, kpi.label)}
                    >
                        {KpiIcon && <KpiIcon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />}
                        <div className={cn("text-xl font-bold", kpi.color)}>{kpi.value}</div>
                        <p className="text-xs text-muted-foreground whitespace-normal">{kpi.label}</p>
                    </div>
                    {index < kpis.length - 1 && <Separator orientation="vertical" className="h-10 self-center" />}
                </React.Fragment>
            )
        })}
    </div>
  )

  const renderBadgeKpis = () => (
    <div className="flex flex-wrap justify-start gap-2 pt-4">
        {kpis!.map(kpi => {
            const isKpiActive = isActive && activeKpiLabel === kpi.label;
            const KpiIcon = kpi.icon;
            return (
                <Badge
                    key={kpi.label} 
                    variant="outline"
                    className={cn(
                        "font-normal h-8 flex items-center gap-2 cursor-pointer transition-all",
                        badgeColorClasses[kpi.color || ''] || 'hover:bg-accent',
                        isKpiActive && 'ring-2 ring-primary ring-offset-2'
                    )}
                    onClick={(e) => handleKpiClick(e, kpi.label)}
                >
                    {KpiIcon && <KpiIcon className="h-4 w-4" />}
                    <span className="font-semibold">{kpi.value}</span>
                     {kpi.secondaryValue !== undefined && (
                        <span className="text-xs text-muted-foreground">({kpi.secondaryValue})</span>
                    )}
                    <span className="text-xs">{kpi.label}</span>
                </Badge>
            )
        })}
    </div>
  )
  
  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isActive && `ring-2 ${ringClass} shadow-lg`,
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground')} />}
      </CardHeader>
      <CardContent>
        {showValue && (
            <div className="text-center py-4">
                {secondaryValue !== undefined ? (
                    <div className="text-center">
                        <span className="text-2xl font-bold">AWBs: {value}</span>
                        <span className="mx-2 text-2xl font-light text-muted-foreground">-</span>
                        <span className="text-2xl font-bold">Recipients: {secondaryValue}</span>
                    </div>
                ) : (
                    <span className="text-3xl font-bold">{value}</span>
                )}
            </div>
        )}
        {hasKpis && layout === 'default' && (
            renderDefaultKpis()
        )}
         {hasKpis && layout === 'badges' && (
            renderBadgeKpis()
        )}
      </CardContent>
    </Card>
  );
};
