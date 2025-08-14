
"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ScorecardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  footerText?: string;
  footerIcon?: React.ElementType;
  onClick: () => void;
  isActive: boolean;
  variant?: 'default' | 'destructive';
}

export const Scorecard: React.FC<ScorecardProps> = ({
  title,
  value,
  icon: Icon,
  footerText,
  footerIcon: FooterIcon,
  onClick,
  isActive,
  variant = 'default',
}) => {
  const ringClass = variant === 'destructive' ? "ring-destructive" : "ring-primary";

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isActive && `ring-2 ${ringClass} shadow-lg`
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-12">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground')} />
      </CardHeader>
      <CardContent className="h-16">
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
      <CardFooter className="h-8 pb-4">
        {footerText && (
          <p className={cn("text-xs flex items-center gap-1", variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground')}>
            {FooterIcon && <FooterIcon className="w-3 h-3" />}
            {footerText}
          </p>
        )}
      </CardFooter>
    </Card>
  );
};
