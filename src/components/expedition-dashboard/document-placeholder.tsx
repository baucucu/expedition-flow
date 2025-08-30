
export const DocumentPlaceholder = ({ title }: { title: string }) => (
    <div className="w-full h-[80vh] mt-4 border rounded-md bg-slate-50 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
            <p className="text-lg font-semibold">Document Placeholder</p>
            <p className="text-sm">{title}</p>
        </div>
    </div>
)
