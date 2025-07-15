"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, List, Grid, Trash, Edit, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { getAllProjects, deleteProject, updateProjectName } from '@/lib/actions'; 
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type Project = {
    id: string;
    name: string;
    lastModified?: string;
    duration?: number;
    gcsPath?: string;
};

type SortConfig = {
    key: 'name' | 'lastModified';
    direction: 'asc' | 'desc';
};

const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

export function ProjectList() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [newProjectName, setNewProjectName] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lastModified', direction: 'desc' });
    const router = useRouter();

    const fetchProjects = useCallback(async () => {
        const { projects: fetchedProjects, error } = await getAllProjects({ orderBy: sortConfig.key, orderDirection: sortConfig.direction });
        if (error) {
            console.error("Failed to fetch projects:", error);
        } else {
            setProjects(fetchedProjects || []);
        }
    }, [sortConfig]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleDelete = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this project?")) {
            const { error } = await deleteProject({ projectId });
            if (error) {
                console.error(`Failed to delete project: ${error}`);
            } else {
                fetchProjects();
            }
        }
    };

    const handleEdit = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setEditingProjectId(project.id);
        setNewProjectName(project.name);
    };

    const handleSave = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        const { error } = await updateProjectName({ projectId, newName: newProjectName });
        if (error) {
            console.error("Failed to update project name:", error);
        } else {
            setEditingProjectId(null);
            fetchProjects();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, projectId: string) => {
        if (e.key === 'Enter') {
            handleSave(e as any, projectId);
        }
    };

    const requestSort = (key: 'name' | 'lastModified') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: 'name' | 'lastModified') => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 inline ml-2" /> : <ArrowDown className="h-4 w-4 inline ml-2" />;
    };

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
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('name')}>
                                        Project Name
                                        {getSortIndicator('name')}
                                    </Button>
                                </TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('lastModified')}>
                                        Last Modified
                                        {getSortIndicator('lastModified')}
                                    </Button>
                                </TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {projects.map((project) => (
                                <TableRow key={project.id}>
                                    <TableCell>
                                        {editingProjectId === project.id ? (
                                            <Input 
                                                value={newProjectName}
                                                onChange={(e) => setNewProjectName(e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, project.id)}
                                            />
                                        ) : (
                                            <Link href={`/project/${project.id}`} className="hover:underline">
                                                {project.name}
                                            </Link>
                                        )}
                                    </TableCell>
                                    <TableCell>{project.duration ? formatDuration(project.duration) : 'N/A'}</TableCell>
                                    <TableCell>{project.lastModified ? new Date(project.lastModified).toLocaleString() : 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className="flex space-x-2">
                                            {editingProjectId === project.id ? (
                                                <Button variant="outline" size="icon" onClick={(e) => handleSave(e, project.id)}>
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="icon" onClick={(e) => handleEdit(e, project)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Link href={`/project/${project.id}`}>
                                                <Button variant="outline" size="icon">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="destructive" size="icon" onClick={(e) => handleDelete(e, project.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {projects.map((project) => (
                        <Card key={project.id}>
                            <Link href={`/project/${project.id}`}>
                                <CardHeader>
                                    <CardTitle className="hover:underline">{project.name}</CardTitle>
                                </CardHeader>
                            </Link>
                            <CardContent>
                                <p>Duration: {project.duration ? formatDuration(project.duration) : 'N/A'}</p>
                                <p>Last Modified: {project.lastModified ? new Date(project.lastModified).toLocaleString() : 'N/A'}</p>
                                <div className="flex space-x-2 mt-4">
                                    <Link href={`/project/${project.id}`}>
                                        <Button variant="outline" size="icon">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button variant="destructive" size="icon" onClick={(e) => handleDelete(e, project.id)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
