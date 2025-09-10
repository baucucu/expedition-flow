
"use client";

import { RecipientRow } from "./types";
import { EditableCell } from "./editable-cell";
import { Mail, Phone } from "lucide-react";
import { Badge } from "../ui/badge";

interface ContactCellProps {
    recipient: RecipientRow;
    onSave: (field: 'address' | 'city' | 'county', value: string) => void;
    gdprMode: boolean;
}

const MASK = '[REDACTED]';

export function ContactCell({ recipient, onSave, gdprMode }: ContactCellProps) {
    if (gdprMode) {
        return <div>{MASK}</div>
    }

    return (
        <div className="flex flex-col gap-1 w-56">
            <EditableCell
                value={recipient.awb?.address ?? 'N/A'}
                onSave={(value) => onSave('address', value)}
            />
            <EditableCell
                value={recipient.awb?.city ?? 'N/A'}
                onSave={(value) => onSave('city', value)}
            />
            <EditableCell
                value={recipient.awb?.county ?? 'N/A'}
                onSave={(value) => onSave('county', value)}
            />
            <div className="flex flex-wrap items-center gap-1 pt-1">
                {recipient.telephone && (
                     <Badge variant="secondary" className="font-normal">
                        <Phone className="w-3 h-3 mr-1.5" />
                        <span>{recipient.telephone}</span>
                    </Badge>
                )}
                 {recipient.email && (
                     <Badge variant="secondary" className="font-normal">
                        <Mail className="w-3 h-3 mr-1.5" />
                        <span>{recipient.email}</span>
                    </Badge>
                )}
            </div>
        </div>
    );
}
