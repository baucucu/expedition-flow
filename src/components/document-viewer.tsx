
"use client";

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, FileWarning } from 'lucide-react';
import * as xlsx from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from './ui/scroll-area';

interface DocumentViewerProps {
    url: string;
    docType: 'pdf' | 'excel' | 'gdrive-pdf' | 'gdrive-excel';
}

type SheetData = (string | number)[][];

export const DocumentViewer = ({ url, docType }: DocumentViewerProps) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [excelData, setExcelData] = useState<SheetData | null>(null);

    useEffect(() => {
        const fetchAndRenderExcel = async () => {
            setLoading(true);
            setError(null);
            try {
                // For excel files, we need to fetch them through a CORS proxy if they are not from our origin
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
            </div>
        );
    }
    
    if (docType === 'gdrive-pdf' || docType === 'gdrive-excel') {
         // Transform the webViewLink into an embeddable preview link
         const embeddableUrl = url.replace("/view?usp=sharing", "/preview").replace("/edit?usp=sharing", "/preview");
         return (
            <div className="w-full h-[80vh] mt-4 border rounded-md">
                <iframe src={embeddableUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="Google Drive Preview" />
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
