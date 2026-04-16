import { Headphones } from "lucide-react";

export default function AudiobooksPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Audiobooks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Exported audio from your documents</p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Headphones size={28} className="text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No audiobooks yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Open a document from your library and export it as an audiobook.
        </p>
      </div>
    </div>
  );
}
