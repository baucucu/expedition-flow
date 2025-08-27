
"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

export interface Kpi {
  value: number;
  label: string;
}

interface ScorecardProps {
  title: string;
  value?: number;
  kpis?: Kpi[];
  icon: React.ElementType;
  footerText?: string;
  footerIcon?: React.ElementType;
  onClick: () => void;
  onFooterClick?: () => void;
  onKpiClick?: (label: string) => void;
  isActive: boolean;
  isFooterActive?: boolean;
  variant?: 'default' | 'destructive';
  errorCount?: number;
}

export const Scorecard: React.FC<ScorecardProps> = ({
  title,
  value,
  kpis,
  icon: Icon,
  footerText,
  footerIcon: FooterIcon,
  onClick,
  onFooterClick,
  onKpiClick,
  isActive,
  isFooterActive = false,
  variant = 'default',
  errorCount,
}) => {
  const ringClass = variant === 'destructive' ? "ring-destructive" : "ring-primary";

  const handleFooterClick = (e: React.MouseEvent) => {
    if (onFooterClick) {
      e.stopPropagation(); // Prevent card's onClick from firing
      onFooterClick();
    }
  };

  const handleKpiClick = (e: React.MouseEvent, label: string) => {
    if (onKpiClick) {
        e.stopPropagation();
        onKpiClick(label);
    }
  }

  const hasErrors = errorCount !== undefined && errorCount > 0;
  const isMultiKpi = kpis && kpis.length > 0;

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
        {isMultiKpi ? (
            <div className="flex w-full items-center justify-around">
                {kpis.map((kpi, index) => (
                    <React.Fragment key={kpi.label}>
                        <div 
                            className={cn("text-center", onKpiClick && "hover:bg-accent p-2 rounded-md")}
                            onClick={(e) => handleKpiClick(e, kpi.label)}
                        >
                            <div className="text-2xl font-bold">{kpi.value}</div>
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
      <CardFooter className="h-8 pb-4">
        {hasErrors && onFooterClick ? (
            <Badge 
                variant="destructive" 
                className={cn(
                    "cursor-pointer",
                    isFooterActive && "ring-2 ring-offset-2 ring-offset-background ring-destructive"
                )}
                onClick={handleFooterClick}
            >
                {FooterIcon && <FooterIcon className="w-3 h-3 mr-1" />}
                {footerText}
            </Badge>
        ) : footerText ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {FooterIcon && <FooterIcon className="w-3 h-3" />}
            {footerText}
          </p>
        ) : null}
      </CardFooter>
    </Card>
  );
};
