
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import type { Expedition, DocumentType, Recipient } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { generateDocumentContentAction } from "@/app/actions/expedition-actions";
import { QrCode, Sparkles, User } from "lucide-react";
import Image from "next/image";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface DocumentAssistantProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  expedition: Expedition;
  onDocumentGenerated: (expeditionId: string, recipientId: string, documentType: DocumentType, content: string) => void;
}

const QRGenerator: React.FC<{ recipientId: string }> = ({ recipientId }) => {
  const uploadUrl = `https://example.com/upload/${recipientId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(uploadUrl)}`;

  return (
    <div className="mt-4 rounded-lg border bg-slate-50 p-4">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><QrCode className="w-4 h-4 text-primary" /> QR Code for Recipient</h4>
        <div className="flex items-center gap-4">
            <Image src={qrCodeUrl} alt="QR Code" width={100} height={100} className="rounded-md"/>
            <div>
                <p className="text-xs text-muted-foreground">Scan this QR code to confirm parcel receipt and upload the signed "proces verbal".</p>
                <a href={uploadUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline mt-1 block">
                    {uploadUrl}
                </a>
            </div>
        </div>
    </div>
  )
};

export const DocumentAssistant: React.FC<DocumentAssistantProps> = ({
  isOpen,
  setIsOpen,
  expedition,
  onDocumentGenerated,
}) => {
  const [selectedRecipientId, setSelectedRecipientId] = React.useState<string>(expedition.recipients[0]?.id || "");
  const [selectedDocType, setSelectedDocType] = React.useState<DocumentType | "">("");
  const [generatedContent, setGeneratedContent] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { toast } = useToast();

  const selectedRecipient = expedition.recipients.find(r => r.id === selectedRecipientId);

  const handleGenerate = async () => {
    if (!selectedDocType || !selectedRecipient) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a recipient and a document type.",
      });
      return;
    }
    
    setIsGenerating(true);
    setGeneratedContent("");

    const expeditionDetails = `
      Expedition ID: ${expedition.id}
      Origin: ${expedition.origin}
      Recipient: ${selectedRecipient.name}, ${selectedRecipient.address}
      Items: ${selectedRecipient.items.join(", ")}
      AWB: ${expedition.awb || 'Not yet generated'}
    `;

    const result = await generateDocumentContentAction({
      documentType: selectedDocType,
      expeditionDetails: expeditionDetails,
      existingContent: selectedRecipient.documents[selectedDocType]?.content || ""
    });

    setIsGenerating(false);

    if (result.success && result.data) {
      setGeneratedContent(result.data.content);
      onDocumentGenerated(expedition.id, selectedRecipient.id, selectedDocType, result.data.content);
      toast({
        title: "Content Generated",
        description: `AI has successfully generated the content for ${selectedDocType}.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: result.error || "An unknown error occurred.",
      });
    }
  };

  React.useEffect(() => {
    if (isOpen) {
        setSelectedRecipientId(expedition.recipients[0]?.id || "");
        setSelectedDocType("");
        setGeneratedContent("");
        setIsGenerating(false);
    }
  }, [isOpen, expedition]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Document Assistant</DialogTitle>
          <DialogDescription>
            Generate content for expedition documents for ID: {expedition.id}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          
          {expedition.recipients.length > 1 && (
             <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2 flex items-center gap-1.5 justify-end">
                    <User className="h-4 w-4" /> Recipient
                </Label>
                 <RadioGroup 
                    value={selectedRecipientId} 
                    onValueChange={setSelectedRecipientId}
                    className="col-span-3"
                    disabled={isGenerating}
                >
                    {expedition.recipients.map(recipient => (
                        <div key={recipient.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={recipient.id} id={recipient.id} />
                            <Label htmlFor={recipient.id} className="font-normal">{recipient.name} - {recipient.address}</Label>
                        </div>
                    ))}
                </RadioGroup>
             </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="doc-type" className="text-right">
              Document Type
            </Label>
            <Select
                value={selectedDocType}
                onValueChange={(value) => setSelectedDocType(value as DocumentType)}
                disabled={isGenerating}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a document" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proces verbal de receptie">Proces verbal de receptie</SelectItem>
                <SelectItem value="instructiuni pentru confirmarea primirii coletului">Instructiuni de confirmare</SelectItem>
                <SelectItem value="parcel inventory">Parcel Inventory</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
             <Label htmlFor="content" className="text-right pt-2">
              Generated Content
            </Label>
            <div className="col-span-3">
              {isGenerating ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : (
                <Textarea id="content" value={generatedContent} readOnly className="min-h-[150px]" placeholder="AI-generated content will appear here."/>
              )}
               {selectedDocType === 'instructiuni pentru confirmarea primirii coletului' && generatedContent && selectedRecipient && (
                <QRGenerator recipientId={selectedRecipient.id} />
               )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>Cancel</Button>
          <Button type="button" onClick={handleGenerate} disabled={!selectedDocType || !selectedRecipientId || isGenerating}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
