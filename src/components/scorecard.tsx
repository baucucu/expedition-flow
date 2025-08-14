
"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from './ui/badge';

interface ScorecardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  footerText?: string;
  footerIcon?: React.ElementType;
  onClick: () => void;
  onFooterClick?: () => void;
  isActive: boolean;
  variant?: 'default' | 'destructive';
  errorCount?: number;
}

export const Scorecard: React.FC<ScorecardProps> = ({
  title,
  value,
  icon: Icon,
  footerText,
  footerIcon: FooterIcon,
  onClick,
  onFooterClick,
  isActive,
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

  const hasErrors = errorCount !== undefined && errorCount > 0;

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
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
      <CardFooter className="h-8 pb-4">
        {hasErrors && onFooterClick ? (
            <Badge 
                variant="destructive" 
                className="cursor-pointer"
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
