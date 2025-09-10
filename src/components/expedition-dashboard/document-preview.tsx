
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";

interface DocumentPreviewProps {
  documentUrl: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documentUrl }) => {
  return (
    <div>
      <iframe src={documentUrl} className="w-full h-96" />
      <Button onClick={() => window.open(documentUrl, '_blank')}>
        Open in new tab
      </Button>
    </div>
  );
};
