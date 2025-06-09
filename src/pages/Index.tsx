
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Database, Scan, Shield, AlertTriangle, Play, Pause, Plus } from "lucide-react";
import ConnectionManager from "@/components/ConnectionManager";
import ScanManager from "@/components/ScanManager";
import ReportViewer from "@/components/ReportViewer";
import { Connection, ScanResult } from "@/types/piiscanner";

const Index = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeScans, setActiveScans] = useState<Map<string, any>>(new Map());
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);

  const handleAddConnection = (connection: Connection) => {
    setConnections(prev => [...prev, { ...connection, id: Date.now().toString() }]);
  };

  const handleDeleteConnection = (id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id));
  };

  const handleStartScan = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (connection) {
      const scanId = `scan-${Date.now()}`;
      setActiveScans(prev => new Map(prev.set(scanId, {
        id: scanId,
        connectionId,
        connectionName: connection.name,
        status: 'running',
        startTime: new Date(),
        progress: 0
      })));

      // Simulate scan progress
      const interval = setInterval(() => {
        setActiveScans(prev => {
          const scan = prev.get(scanId);
          if (scan && scan.progress < 100) {
            const newProgress = Math.min(scan.progress + Math.random() * 15, 100);
            const updatedScan = { ...scan, progress: newProgress };
            
            if (newProgress >= 100) {
              updatedScan.status = 'completed';
              updatedScan.endTime = new Date();
              
              // Add mock scan result
              setScanResults(prevResults => [...prevResults, {
                id: scanId,
                connectionId,
                connectionName: connection.name,
                scanDate: new Date(),
                totalTables: Math.floor(Math.random() * 50) + 10,
                tablesWithPii: Math.floor(Math.random() * 20) + 5,
                piiFields: Math.floor(Math.random() * 100) + 20,
                riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)] as 'Low' | 'Medium' | 'High'
              }]);
              
              clearInterval(interval);
            }
            
            return new Map(prev.set(scanId, updatedScan));
          }
          return prev;
        });
      }, 1000);
    }
  };

  const handlePauseScan = (scanId: string) => {
    setActiveScans(prev => {
      const scan = prev.get(scanId);
      if (scan) {
        return new Map(prev.set(scanId, { ...scan, status: 'paused' }));
      }
      return prev;
    });
  };

  const totalConnections = connections.length;
  const runningScans = Array.from(activeScans.values()).filter(scan => scan.status === 'running').length;
  const totalScans = scanResults.length;
  const highRiskFindings = scanResults.filter(result => result.riskLevel === 'High').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            PII Scanner Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage database connections and scan for personally identifiable information
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalConnections}</div>
              <p className="text-xs text-muted-foreground">
                Configured database connections
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Scans</CardTitle>
              <Scan className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{runningScans}</div>
              <p className="text-xs text-muted-foreground">
                Currently running scans
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalScans}</div>
              <p className="text-xs text-muted-foreground">
                Completed scan reports
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Findings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{highRiskFindings}</div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="connections" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="scans">Scans</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="connections">
            <ConnectionManager
              connections={connections}
              onAddConnection={handleAddConnection}
              onDeleteConnection={handleDeleteConnection}
              onStartScan={handleStartScan}
            />
          </TabsContent>

          <TabsContent value="scans">
            <ScanManager
              connections={connections}
              activeScans={activeScans}
              onStartScan={handleStartScan}
              onPauseScan={handlePauseScan}
            />
          </TabsContent>

          <TabsContent value="reports">
            <ReportViewer scanResults={scanResults} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
