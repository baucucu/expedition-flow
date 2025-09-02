
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
  icon: React.ElementType;
  onClick: () => void;
  onKpiClick?: (label: string) => void;
  isActive: boolean;
  variant?: 'default' | 'destructive';
}

export const Scorecard: React.FC<ScorecardProps> = ({
  title,
  value,
  kpis,
  icon: Icon,
  onClick,
  onKpiClick,
  isActive,
  variant = 'default',
}) => {
  const ringClass = variant === 'destructive' ? "ring-destructive" : "ring-primary";

  const handleKpiClick = (e: React.MouseEvent, label: string) => {
    if (onKpiClick) {
        e.stopPropagation();
        onKpiClick(label);
    }
  }

  const showKpisInContent = value === undefined && kpis && kpis.length > 0;
  const showKpisInFooter = value !== undefined && kpis && kpis.length > 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md flex flex-col justify-between",
        isActive && `ring-2 ${ringClass} shadow-lg`
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-12">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground')} />
      </CardHeader>
      <CardContent className="h-16 flex items-center">
        {showKpisInContent ? (
             <div className="flex w-full items-center justify-around">
                {kpis.map((kpi, index) => (
                    <React.Fragment key={kpi.label}>
                        <div 
                            className={cn("text-center", onKpiClick && "hover:bg-accent p-2 rounded-md")}
                            onClick={(e) => handleKpiClick(e, kpi.label)}
                        >
                            <div className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</div>
                            <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        </div>
                        {index < kpis.length - 1 && <Separator orientation="vertical" className="h-10" />}
                    </React.Fragment>
                ))}
            </div>
        ) : (
            <div className="text-3xl font-bold">{value}</div>
        )}
      </CardContent>
       {showKpisInFooter && (
         <CardFooter className="h-8 pb-4 flex justify-end items-center gap-x-4">
            {kpis.map(kpi => {
                const isBadge = kpi.color?.startsWith('bg-');
                return (
                    <div 
                        key={kpi.label} 
                        className={cn(
                            "flex items-center gap-x-1",
                            onKpiClick && "cursor-pointer hover:underline"
                        )}
                        onClick={(e) => handleKpiClick(e, kpi.label)}
                    >
                        <span className={cn(
                            "text-sm font-bold",
                            isBadge && `${kpi.color} text-destructive-foreground px-1.5 py-0.5 rounded-sm`
                        )}>
                            {kpi.value}
                        </span>
                        <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    </div>
                )
            })}
         </CardFooter>
      )}
    </Card>
  );
};
