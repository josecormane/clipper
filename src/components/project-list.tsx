"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, List, Grid } from 'lucide-react';
import { getAllProjects } from '@/lib/actions'; 
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type Project = {
    id: string;
    name: string;
    lastModified?: string;
};

export function ProjectList() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const router = useRouter();

    useEffect(() => {
        const fetchProjects = async () => {
            const { projects: fetchedProjects, error } = await getAllProjects();
            if (error) {
                console.error("Failed to fetch projects:", error);
                // Handle error appropriately
            } else {
                setProjects(fetchedProjects || []);
            }
        };
        fetchProjects();
    }, []);

    return (
        <div>
            <div className="flex justify-end mb-4">
                <div className="flex items-center space-x-2">
                    <Label htmlFor="view-mode-switch">
                        {viewMode === 'list' ? <List /> : <Grid />}
                    </Label>
                    <Switch
                        id="view-mode-switch"
                        checked={viewMode === 'grid'}
                        onCheckedChange={(checked) => setViewMode(checked ? 'grid' : 'list')}
                    />
                </div>
            </div>
            {viewMode === 'list' ? (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Project Name</TableHead>
                                <TableHead>Last Modified</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projects.map((project) => (
                                <TableRow key={project.id} onClick={() => router.push(`/project/${project.id}`)} className="cursor-pointer">
                                    <TableCell>{project.name}</TableCell>
                                    <TableCell>{project.lastModified ? new Date(project.lastModified).toLocaleString() : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/project/${project.id}`); }}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {projects.map((project) => (
                        <Card key={project.id} onClick={() => router.push(`/project/${project.id}`)} className="cursor-pointer">
                            <CardHeader>
                                <CardTitle>{project.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>Last Modified: {project.lastModified ? new Date(project.lastModified).toLocaleString() : 'N/A'}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
