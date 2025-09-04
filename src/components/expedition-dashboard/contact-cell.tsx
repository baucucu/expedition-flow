
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
        <div className="flex flex-col gap-2 w-64">
            <div className="whitespace-normal">
                <EditableCell
                    value={recipient.awb?.address ?? 'N/A'}
                    onSave={(value) => onSave('address', value)}
                />
            </div>
            <div className="flex gap-2">
                <div className="flex-1">
                     <EditableCell
                        value={recipient.awb?.city ?? 'N/A'}
                        onSave={(value) => onSave('city', value)}
                    />
                </div>
                <div className="flex-1">
                    <EditableCell
                        value={recipient.awb?.county ?? 'N/A'}
                        onSave={(value) => onSave('county', value)}
                    />
                </div>
            </div>
            {recipient.telephone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span>{recipient.telephone}</span>
                </div>
            )}
        </div>
    );
}

