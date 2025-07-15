export function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <img src="/machete-icon.png" alt="Machete Icon" className="h-8 w-8" />
      <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--accent-start))] to-[hsl(var(--accent-end))]">Machete</span>
    </div>
  );
}
