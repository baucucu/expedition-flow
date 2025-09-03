"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Edit, X } from "lucide-react";

interface EditableCellProps {
    value: string;
    onSave: (value: string) => void;
}

export function EditableCell({ value, onSave }: EditableCellProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [isHovered, setIsHovered] = useState(false);

    const handleSave = () => {
        onSave(inputValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setInputValue(value);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center space-x-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="h-8"
                />
                <Button variant="ghost" size="icon" onClick={handleSave} className="h-8 w-8">
                    <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div
            className="flex items-center space-x-2"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span>{value}</span>
            {isHovered && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                    className="h-8 w-8 ml-2"
                >
                    <Edit className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
