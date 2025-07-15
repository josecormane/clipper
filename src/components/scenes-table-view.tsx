"use client";

import * as React from "react";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Play, Split, Merge } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { secondsToTimeString, timeStringToSeconds } from "@/lib/utils"; // Assuming these are in utils.ts

type Scene = {
  id: number;
  startTime: string;
  endTime: string;
  description: string;
  thumbnail?: string;
};

interface ScenesTableViewProps {
  scenes: Scene[];
  onUpdate: (scene: Scene) => void;
  onPreview: (scene: Scene) => void;
  onSplit: (sceneId: number, splitTime: number) => void;
  onMerge: (sceneIds: number[]) => void;
  onSegmentClick: (startTime: string, endTime: string) => void;
  selectedScenes: Set<number>;
  setSelectedScenes: React.Dispatch<React.SetStateAction<Set<number>>>;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function ScenesTableView({
  scenes,
  onUpdate,
  onPreview,
  onSplit,
  onMerge,
  onSegmentClick,
  selectedScenes,
  setSelectedScenes,
  videoRef,
}: ScenesTableViewProps) {
  const [editingCell, setEditingCell] = React.useState<{ id: number; field: keyof Scene } | null>(null);
  const [inputValue, setInputValue] = React.useState<string>("");
  const [splitTimeInput, setSplitTimeInput] = React.useState<string>("");
  const [splitSceneId, setSplitSceneId] = React.useState<number | null>(null);

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  };

  const handleEditBlur = (scene: Scene) => {
    if (editingCell) {
      const updatedScene = { ...scene, [editingCell.field]: inputValue };
      onUpdate(updatedScene);
      setEditingCell(null);
      setInputValue("");
    }
  };

  const handleTimeChange = (scene: Scene, field: 'startTime' | 'endTime', newTime: Date | undefined) => {
    if (!newTime) return;
    const newTimeString = format(newTime, 'HH:mm:ss');
    const updatedScene = { ...scene, [field]: newTimeString };
    onUpdate(updatedScene);
  };

  const handleSplitClick = (sceneId: number) => {
    setSplitSceneId(sceneId);
    setSplitTimeInput("");
  };

  const handleSplitConfirm = () => {
    if (splitSceneId !== null) {
      const [hours, minutes, seconds] = splitTimeInput.split(':').map(Number);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      onSplit(splitSceneId, totalSeconds);
      setSplitSceneId(null);
      setSplitTimeInput("");
    }
  };

  const columns: ColumnDef<Scene>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedScenes.has(row.original.id)}
          onCheckedChange={(checked) => {
            setSelectedScenes(prev => {
              const newSelection = new Set(prev);
              if (checked) newSelection.add(row.original.id);
              else newSelection.delete(row.original.id);
              return newSelection;
            });
          }}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "startTime",
      header: "Start Time",
      cell: ({ row }) => {
        const scene = row.original;
        const timeValue = timeStringToSeconds(scene.startTime);
        const date = new Date(0, 0, 0, Math.floor(timeValue / 3600), Math.floor((timeValue % 3600) / 60), timeValue % 60);

        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[150px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {scene.startTime ? scene.startTime : "Pick a time"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => handleTimeChange(scene, 'startTime', newDate)}
                initialFocus
              />
               <Input
                type="text"
                value={scene.startTime}
                onChange={(e) => {
                    const newTime = e.target.value;
                    const [h, m, s] = newTime.split(':').map(Number);
                    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
                        const dateInput = new Date(0, 0, 0, h, m, s);
                        handleTimeChange(scene, 'startTime', dateInput);
                    }
                }}
                onBlur={() => onUpdate(scene)}
                className="mt-2"
                placeholder="HH:MM:SS"
            />
            </PopoverContent>
          </Popover>
        );
      },
    },
    {
      accessorKey: "endTime",
      header: "End Time",
      cell: ({ row }) => {
        const scene = row.original;
        const timeValue = timeStringToSeconds(scene.endTime);
        const date = new Date(0, 0, 0, Math.floor(timeValue / 3600), Math.floor((timeValue % 3600) / 60), timeValue % 60);

        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[150px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {scene.endTime ? scene.endTime : "Pick a time"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => handleTimeChange(scene, 'endTime', newDate)}
                initialFocus
              />
              <Input
                type="text"
                value={scene.endTime}
                onChange={(e) => {
                    const newTime = e.target.value;
                    const [h, m, s] = newTime.split(':').map(Number);
                    if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
                        const dateInput = new Date(0, 0, 0, h, m, s);
                        handleTimeChange(scene, 'endTime', dateInput);
                    }
                }}
                onBlur={() => onUpdate(scene)}
                className="mt-2"
                placeholder="HH:MM:SS"
            />
            </PopoverContent>
          </Popover>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        const scene = row.original;
        const isEditing = editingCell?.id === scene.id && editingCell?.field === "description";

        return isEditing ? (
          <Input
            value={inputValue}
            onChange={handleEditChange}
            onBlur={() => handleEditBlur(scene)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleEditBlur(scene);
              }
            }}
            autoFocus
          />
        ) : (
          <div onClick={() => { setEditingCell({ id: scene.id, field: "description" }); setInputValue(scene.description); }}>
            {scene.description}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const scene = row.original;
        const currentlySelected = Array.from(selectedScenes);

        return (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={() => onPreview(scene)} title="Preview Scene">
              <Play className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" title="Split Scene" onClick={() => handleSplitClick(scene.id)}>
                  <Split className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <Input
                  placeholder="HH:MM:SS"
                  value={splitTimeInput}
                  onChange={(e) => setSplitTimeInput(e.target.value)}
                  className="mb-2"
                />
                <Button onClick={handleSplitConfirm} disabled={!splitTimeInput}>Confirm Split</Button>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMerge(currentlySelected)}
              disabled={currentlySelected.length < 2 || !currentlySelected.includes(scene.id)}
              title="Merge Selected Scenes"
            >
              <Merge className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: scenes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id.toString(), // Important for row selection
    state: {
      rowSelection: Array.from(selectedScenes).reduce((acc, id) => {
        acc[id.toString()] = true;
        return acc;
      }, {} as Record<string, boolean>),
    },
    onRowSelectionChange: (updater) => {
        const newSelection: Record<string, boolean> = typeof updater === 'function'
            ? updater(table.getState().rowSelection)
            : updater;
        setSelectedScenes(new Set(Object.keys(newSelection).filter(key => newSelection[key]).map(Number)));
    },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
