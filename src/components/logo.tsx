import { Clapperboard } from "lucide-react";

export function Logo() {
  return (
    <div className="bg-primary p-2.5 rounded-lg flex items-center justify-center">
      <Clapperboard className="text-primary-foreground" size={24} />
    </div>
  );
}
