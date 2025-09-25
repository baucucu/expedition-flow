
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { LogOut, Box, Plus, File, ListChecks, ShieldCheck, DatabaseZap } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useRouter } from 'next/navigation';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { useAuth } from '@/hooks/use-auth';

interface AppHeaderProps {
    gdprMode?: boolean;
    onGdprModeChange?: (value: boolean) => void;
}

export const AppHeader = ({ gdprMode, onGdprModeChange }: AppHeaderProps) => {
    const router = useRouter();
    const { isReadOnly } = useAuth();

    const handleSignOut = async () => {
        await auth.signOut();
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
                <Box className="h-6 w-6" />
                <h1 className="text-xl font-bold tracking-tight">Expedition Manager</h1>
            </div>
            <div className="ml-auto flex items-center gap-4">
                 {onGdprModeChange && (
                    <div className="flex items-center space-x-2">
                        <ShieldCheck className="h-5 w-5" />
                        <Label htmlFor="gdpr-mode" className="text-sm font-medium">GDPR Mode</Label>
                        <Switch
                            id="gdpr-mode"
                            checked={gdprMode}
                            onCheckedChange={onGdprModeChange}
                        />
                    </div>
                )}
                 {!isReadOnly && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => router.push('/documents')}>
                            <File className="mr-2 h-4 w-4" />
                            Manage Documents
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/awb-statuses')}>
                            <ListChecks className="mr-2 h-4 w-4" />
                            AWB Statuses
                        </Button>
                         <Button variant="destructive" size="sm" onClick={() => router.push('/admin/overwrite-ids')}>
                            <DatabaseZap className="mr-2 h-4 w-4" />
                            Overwrite IDs
                        </Button>
                        <Button onClick={() => router.push('/expeditions/new')}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Expedition
                        </Button>
                    </>
                 )}
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Sign Out</span>
                </Button>
            </div>
        </header>
    );
};
