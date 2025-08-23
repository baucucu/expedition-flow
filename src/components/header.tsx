
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { LogOut, Box, Plus, File } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useRouter } from 'next/navigation';

export const AppHeader = () => {
    const router = useRouter();

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
                 <Button variant="outline" size="sm" onClick={() => router.push('/documents')}>
                    <File className="mr-2 h-4 w-4" />
                    Manage Documents
                </Button>
                 <Button onClick={() => router.push('/expeditions/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Expedition
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Sign Out</span>
                </Button>
            </div>
        </header>
    );
};
