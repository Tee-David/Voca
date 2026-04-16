import { BookOpen, Upload } from "lucide-react";

export default function LibraryPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your uploaded documents</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition">
          <Upload size={15} />
          Upload
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <BookOpen size={28} className="text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No books yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Upload a PDF, EPUB, TXT, or DOCX to start listening.
        </p>
        <button className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition">
          <Upload size={15} />
          Upload your first book
        </button>
      </div>
    </div>
  );
}
