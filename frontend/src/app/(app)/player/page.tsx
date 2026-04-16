import { Headphones } from "lucide-react";
import Link from "next/link";

export default function PlayerPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Headphones size={28} className="text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">Nothing playing</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Open a document from your library to start listening.
      </p>
      <Link
        href="/library"
        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition"
      >
        Go to Library
      </Link>
    </div>
  );
}
