
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Expedition } from "@/types";
import { Badge } from "./ui/badge";
import { Paperclip, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailComposerProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  expedition: Expedition;
  onEmailSent: (expeditionId: string) => void;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  isOpen,
  setIsOpen,
  expedition,
  onEmailSent
}) => {
  const logisticsCompanyEmail = "logistics@example.com";
  const subject = `Expedition Documents for AWB: ${expedition.awb || expedition.id}`;
  const body = `
Dear Logistics Team,

Please find attached the necessary documents for the expedition with AWB ${expedition.awb || expedition.id}.

Details:
- Origin: ${expedition.origin}
- Destination: ${expedition.destination}

Thank you,
Expedition Manager System
  `.trim();

  const attachments = Object.entries(expedition.documents)
    .filter(([, doc]) => doc.status === "Generated")
    .map(([docType]) => {
      const fileName = `${docType.replace(/ /g, "_")}_${expedition.id}.pdf`;
      return { name: fileName, type: docType };
    });
  
  if (expedition.awb) {
    attachments.push({ name: `AWB_${expedition.awb}.pdf`, type: "AWB" });
  }

  const { toast } = useToast();

  const handleSend = () => {
    // In a real app, this would trigger an API call to send the email.
    // Here, we just simulate success and update the state.
    onEmailSent(expedition.id);
    setIsOpen(false);
    toast({
      title: "Email Marked as Sent",
      description: `The expedition ${expedition.id} has been moved to 'Sent to Logistics'.`
    });
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Prepare Email</DialogTitle>
          <DialogDescription>
            Review the email to be sent to the logistics company for expedition {expedition.id}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="to" className="text-right">
              To
            </Label>
            <Input id="to" value={logisticsCompanyEmail} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Subject
            </Label>
            <Input id="subject" value={subject} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="body" className="text-right pt-2">
              Body
            </Label>
            <Textarea id="body" value={body} readOnly className="col-span-3 min-h-[150px]" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2 flex items-center gap-1.5 justify-end">
              <Paperclip className="h-4 w-4" />
              Attachments
            </Label>
            <div className="col-span-3">
              {attachments.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {attachments.map((file) => (
                        <Badge key={file.name} variant="secondary" className="font-normal">
                            {file.name}
                        </Badge>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documents generated yet.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="button" onClick={handleSend} disabled={attachments.length === 0}>
            <Send className="mr-2 h-4 w-4" />
            Mark as Sent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

    