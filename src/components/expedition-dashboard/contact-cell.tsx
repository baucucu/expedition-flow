
"use client";

import { RecipientRow } from "./types";
import { EditableCell } from "./editable-cell";
import { Phone } from "lucide-react";

interface ContactCellProps {
    recipient: RecipientRow;
    onSave: (field: 'address' | 'city' | 'county', value: string) => void;
}

export function ContactCell({ recipient, onSave }: ContactCellProps) {
    return (
        <div className="flex flex-col gap-1">
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
            {recipient.telephone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                    <Phone className="w-3 h-3" />
                    <span>{recipient.telephone}</span>
                </div>
            )}
        </div>
    );
}
