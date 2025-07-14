"use client";

import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Clock } from "lucide-react";

type Scene = {
  id: number;
  startTime: string;
  endTime: string;
  description: string;
  thumbnail: string;
};

interface SceneCardProps {
  scene: Scene;
  onUpdate: (scene: Scene) => void;
}

export function SceneCard({ scene, onUpdate }: SceneCardProps) {
  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    onUpdate({ ...scene, [field]: value });
  };

  return (
    <Card className="overflow-hidden bg-card/80 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <Image
            src={scene.thumbnail}
            alt={`Scene ${scene.id}`}
            width={160}
            height={90}
            className="object-cover w-full h-full"
            data-ai-hint="video scene"
          />
        </div>
        <div className="col-span-2">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3">{scene.description}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`start-${scene.id}`} className="flex items-center text-xs text-muted-foreground mb-1">
                  <Clock className="w-3 h-3 mr-1" />
                  Start
                </Label>
                <Input
                  id={`start-${scene.id}`}
                  value={scene.startTime}
                  onChange={(e) => handleTimeChange("startTime", e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                 <Label htmlFor={`end-${scene.id}`} className="flex items-center text-xs text-muted-foreground mb-1">
                    <Clock className="w-3 h-3 mr-1" />
                    End
                 </Label>
                <Input
                  id={`end-${scene.id}`}
                  value={scene.endTime}
                  onChange={(e) => handleTimeChange("endTime", e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
          </CardContent>
        </div>
      </div>
       <CardFooter className="bg-muted/30 px-4 py-2">
          <Button variant="ghost" size="sm" className="w-full justify-start text-accent hover:text-accent hover:bg-accent/10">
            <Download className="mr-2 h-4 w-4" />
            Download Clip
          </Button>
        </CardFooter>
    </Card>
  );
}
