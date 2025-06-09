
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Database, Play, Calendar } from "lucide-react";
import { Connection, DatabaseType } from "@/types/piiscanner";
import { useToast } from "@/hooks/use-toast";

interface ConnectionManagerProps {
  connections: Connection[];
  onAddConnection: (connection: Connection) => void;
  onDeleteConnection: (id: string) => void;
  onStartScan: (connectionId: string) => void;
}

const databaseConfigs = {
  postgresql: { label: 'PostgreSQL', defaultPort: 5432, color: 'bg-blue-500' },
  mysql: { label: 'MySQL', defaultPort: 3306, color: 'bg-orange-500' },
  sqlite3: { label: 'SQLite3', defaultPort: 0, color: 'bg-green-500' },
  redshift: { label: 'AWS Redshift', defaultPort: 5439, color: 'bg-purple-500' },
  athena: { label: 'AWS Athena', defaultPort: 0, color: 'bg-yellow-500' },
  snowflake: { label: 'Snowflake', defaultPort: 443, color: 'bg-cyan-500' },
  bigquery: { label: 'BigQuery', defaultPort: 0, color: 'bg-red-500' },
};

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  connections,
  onAddConnection,
  onDeleteConnection,
  onStartScan
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '' as DatabaseType,
    host: '',
    port: '',
    database: '',
    username: '',
    password: ''
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.host || !formData.username) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const connection: Connection = {
      id: '',
      name: formData.name,
      type: formData.type,
      host: formData.host,
      port: formData.port ? parseInt(formData.port) : databaseConfigs[formData.type].defaultPort,
      database: formData.database,
      username: formData.username,
      password: formData.password,
      createdAt: new Date()
    };

    onAddConnection(connection);
    setIsDialogOpen(false);
    setFormData({
      name: '',
      type: '' as DatabaseType,
      host: '',
      port: '',
      database: '',
      username: '',
      password: ''
    });

    toast({
      title: "Connection added",
      description: `${formData.name} has been successfully added`,
    });
  };

  const handleTypeChange = (type: DatabaseType) => {
    setFormData(prev => ({
      ...prev,
      type,
      port: databaseConfigs[type].defaultPort.toString()
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Database Connections</h2>
          <p className="text-muted-foreground">Manage your database connections for PII scanning</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Database Connection</DialogTitle>
              <DialogDescription>
                Configure a new database connection for PII scanning
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Connection Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Database"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Database Type *</Label>
                <Select value={formData.type} onValueChange={handleTypeChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select database type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(databaseConfigs).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="host">Host *</Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="localhost"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                    placeholder="5432"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="database">Database Name</Label>
                <Input
                  id="database"
                  value={formData.database}
                  onChange={(e) => setFormData(prev => ({ ...prev, database: e.target.value }))}
                  placeholder="my_database"
                />
              </div>

              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="username"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Connection</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {connections.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Connections</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first database connection
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connections.map((connection) => (
            <Card key={connection.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${databaseConfigs[connection.type].color}`} />
                    <CardTitle className="text-lg">{connection.name}</CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {databaseConfigs[connection.type].label}
                  </Badge>
                </div>
                <CardDescription className="flex items-center space-x-2">
                  <span>{connection.host}:{connection.port}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div>Database: {connection.database || 'N/A'}</div>
                  <div>Username: {connection.username}</div>
                  {connection.lastScan && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>Last scan: {connection.lastScan.toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => onStartScan(connection.id)}
                    className="flex-1"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Scan
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDeleteConnection(connection.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConnectionManager;
