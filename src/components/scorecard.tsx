
"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Separator } from './ui/separator';

export interface Kpi {
  value: number;
  label: string;
  color?: string;
}

interface ScorecardProps {
  title: string;
  value?: number;
  kpis?: Kpi[];
  icon?: React.ElementType;
  iconMapping?: Record<string, React.ElementType>;
  onClick: () => void;
  onKpiClick?: (label: string) => void;
  isActive: boolean;
  activeKpiLabel?: string;
  variant?: 'default' | 'destructive';
  className?: string;
}

export const Scorecard: React.FC<ScorecardProps> = ({
  title,
  value,
  kpis,
  icon: Icon,
  iconMapping,
  onClick,
  onKpiClick,
  isActive,
  activeKpiLabel,
  variant = 'default',
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
  
  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md flex flex-col",
        isActive && `ring-2 ${ringClass} shadow-lg`,
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground')} />}
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center">
        {showValue ? (
            <div className="text-3xl font-bold text-center">{value}</div>
        ) : hasKpis ? (
            <div className="flex w-full items-center justify-around flex-wrap gap-2">
                {kpis!.map((kpi, index) => {
                    const isKpiActive = isActive && activeKpiLabel === kpi.label;
                    const KpiIcon = iconMapping ? iconMapping[kpi.label] : null;
                    
                    return (
                        <React.Fragment key={kpi.label}>
                            <div 
                                className={cn(
                                    "text-center p-2 rounded-md transition-colors", 
                                    onKpiClick && "hover:bg-accent",
                                    isKpiActive && 'bg-muted'
                                )}
                                onClick={(e) => handleKpiClick(e, kpi.label)}
                            >
                                {KpiIcon && <KpiIcon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />}
                                <div className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</div>
                                <p className="text-xs text-muted-foreground whitespace-normal max-w-20">{kpi.label}</p>
                            </div>
                            {index < kpis.length - 1 && kpis[index+1].value > 0 && <Separator orientation="vertical" className="h-10" />}
                        </React.Fragment>
                    )
                })}
            </div>
        ) : null }
      </CardContent>
       {showValue && hasKpis && (
         <CardFooter className="flex-wrap justify-center gap-x-4 gap-y-2 pt-4">
            {kpis!.map(kpi => {
                const isKpiActive = isActive && activeKpiLabel === kpi.label;
                return (
                    <div 
                        key={kpi.label} 
                        className={cn(
                            "flex items-center gap-x-1 p-1 rounded-md transition-colors",
                            onKpiClick && "cursor-pointer hover:bg-accent",
                            isKpiActive && 'bg-muted'
                        )}
                        onClick={(e) => handleKpiClick(e, kpi.label)}
                    >
                        <span className="text-sm font-bold">{kpi.value}</span>
                        <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    </div>
                )
            })}
         </CardFooter>
      )}
    </Card>
  );
};

  
