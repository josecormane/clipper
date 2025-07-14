import { Clipper } from "@/components/clipper";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 w-full bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
          <div className="flex items-center gap-4">
            <Logo />
            <h1 className="text-2xl lg:text-3xl font-headline font-bold text-primary">
              GeminiClipper
            </h1>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Clipper />
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        Powered by Gemini
      </footer>
    </div>
  );
}
