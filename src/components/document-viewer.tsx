
"use client";

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, FileWarning, Image } from 'lucide-react';
import * as xlsx from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatPvSemnatAction } from '@/app/actions/pv-semnat-actions';

interface DocumentViewerProps {
    url: string;
    docType: 'pdf' | 'excel' | 'gdrive-pdf' | 'gdrive-excel' | 'image';
    recipientDocId?: string;
}

type SheetData = (string | number)[][];

const extractFileIdFromUrl = (url: string): string | null => {
    const regex = /(?:https\:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=|drive\/folders\/|drive\/u\/\d+\/folders\/))([a-zA-Z0-9_-]{25,})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};


export const DocumentViewer = ({ url, docType, recipientDocId }: DocumentViewerProps) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [excelData, setExcelData] = useState<SheetData | null>(null);
    const [isFormatting, setIsFormatting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAndRenderExcel = async () => {
            setLoading(true);
            setError(null);
            try {
                const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
                const response = await fetch(`${proxyUrl}${url}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch file: ${response.statusText}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const workbook = xlsx.read(arrayBuffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as SheetData;
                setExcelData(jsonData);
            } catch (err: any) {
                setError(`Could not load or parse the Excel file. Please ensure the link is a direct download link and CORS is handled if needed. Error: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        if (docType === 'excel') {
            fetchAndRenderExcel();
        } else {
            setLoading(false);
        }
    }, [url, docType]);
    
    const handleFormatImage = async () => {
        if (!recipientDocId) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "The recipient document ID is missing, cannot format.",
            });
            return;
        }

        setIsFormatting(true);
        const result = await formatPvSemnatAction({ recipientDocId, pvSemnatUrl: url });
        setIsFormatting(false);

        if (result.success) {
            toast({
                title: "Formatting Queued",
                description: "The PV Semnat is being formatted. The view will update once it's complete.",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Formatting Failed",
                description: result.message,
            });
        }
    };

    if (loading) {
        return (
            <div className="w-full h-[80vh] mt-4 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading document...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-[80vh] mt-4 flex flex-col items-center justify-center text-destructive border rounded-md p-4">
                <AlertTriangle className="h-8 w-8 mb-4" />
                <p className="text-center font-semibold">Error Loading Document</p>
                <p className="text-center text-sm">{error}</p>
                 {docType === 'image' && recipientDocId && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">The image might be in an unsupported format (e.g., HEIC). You can try to format it.</p>
                        <Button onClick={handleFormatImage} disabled={isFormatting}>
                            {isFormatting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Image className="mr-2 h-4 w-4" />}
                            Format File
                        </Button>
                    </div>
                )}
            </div>
        );
    }
    
    if (docType === 'gdrive-pdf' || docType === 'gdrive-excel') {
         const fileId = extractFileIdFromUrl(url);
         if (!fileId) {
             return (
                <div className="w-full h-[80vh] mt-4 flex flex-col items-center justify-center text-destructive border rounded-md p-4">
                    <AlertTriangle className="h-8 w-8 mb-4" />
                    <p className="text-center font-semibold">Invalid Google Drive URL</p>
                    <p className="text-center text-sm">Could not extract a valid File ID from the provided URL.</p>
                </div>
            );
        }
        
        const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        
         return (
            <div className="w-full h-[80vh] mt-4 border rounded-md">
                <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Google Drive Viewer" />
            </div>
        );
    }
    
    if (docType === 'pdf') {
        const encodedUrl = encodeURIComponent(url);
        const googleDocsUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
        return (
            <div className="w-full h-[80vh] mt-4 border rounded-md">
                <iframe src={googleDocsUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="PDF Document Viewer" />
            </div>
        );
    }

    if (docType === 'image') {
        return (
            <div className="w-full h-[80vh] mt-4 flex items-center justify-center border rounded-md overflow-auto p-4 bg-muted/20">
                <img src={url} alt="Document Preview" className="max-w-full max-h-full h-auto w-auto object-contain" onError={() => setError("This image format might not be supported by the browser.")} />
            </div>
        );
    }

    if (docType === 'excel' && excelData) {
         if (!excelData || excelData.length === 0) {
            return (
                 <div className="w-full h-[80vh] mt-4 flex flex-col items-center justify-center text-muted-foreground border rounded-md p-4">
                    <FileWarning className="h-8 w-8 mb-4" />
                    <p className="text-center font-semibold">Empty Excel File</p>
                    <p className="text-center text-sm">The inventory file is empty or could not be read.</p>
                </div>
            )
        }
        const header = excelData[0];
        const rows = excelData.slice(1);
        return (
             <ScrollArea className="h-[80vh] w-full mt-4 rounded-md border">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            {header.map((col, index) => <TableHead key={index}>{col}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, rowIndex) => (
                            <TableRow key={rowIndex}>
                                {row.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </ScrollArea>
        );
    }

    return null;
};
