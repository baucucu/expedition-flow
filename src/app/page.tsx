import { ExpeditionDashboard } from "@/components/expedition-dashboard";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import { AppLogo } from "@/components/icons";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <AppLogo />
          <h1 className="text-xl font-bold tracking-tight">ExpeditionFlow</h1>
        </div>
        <div className="ml-auto">
          <Button>
            <UploadCloud className="mr-2 h-4 w-4" />
            Import Expeditions
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col p-4 md:p-6">
        <ExpeditionDashboard />
      </main>
    </div>
  );
}
