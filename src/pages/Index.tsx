import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Database, Scan, Shield, AlertTriangle, Play, Pause, Plus } from "lucide-react";
import ConnectionManager from "@/components/ConnectionManager";
import ScanManager from "@/components/ScanManager";
import ReportViewer from "@/components/ReportViewer";
import { Connection, ScanResult } from "@/types/piiscanner";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeScans, setActiveScans] = useState<Map<string, any>>(new Map());
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [validatedConnections, setValidatedConnections] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedConnections = localStorage.getItem('pii-scanner-connections');
    const savedScanResults = localStorage.getItem('pii-scanner-results');
    const savedActiveScans = localStorage.getItem('pii-scanner-active-scans');
    const savedValidatedConnections = localStorage.getItem('pii-scanner-validated-connections');
    
    if (savedConnections) {
      try {
        const parsed = JSON.parse(savedConnections);
        setConnections(parsed.map((conn: any) => ({
          ...conn,
          createdAt: new Date(conn.createdAt),
          lastScan: conn.lastScan ? new Date(conn.lastScan) : undefined
        })));
      } catch (error) {
        console.error('Error loading connections:', error);
      }
    }
    
    if (savedScanResults) {
      try {
        const parsed = JSON.parse(savedScanResults);
        setScanResults(parsed.map((result: any) => ({
          ...result,
          scanDate: new Date(result.scanDate)
        })));
      } catch (error) {
        console.error('Error loading scan results:', error);
      }
    }

    if (savedActiveScans) {
      try {
        const parsed = JSON.parse(savedActiveScans);
        const scansMap = new Map();
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          scansMap.set(key, {
            ...value,
            startTime: new Date(value.startTime),
            endTime: value.endTime ? new Date(value.endTime) : undefined
          });
        });
        setActiveScans(scansMap);
      } catch (error) {
        console.error('Error loading active scans:', error);
      }
    }

    if (savedValidatedConnections) {
      try {
        const parsed = JSON.parse(savedValidatedConnections);
        setValidatedConnections(new Set(parsed));
      } catch (error) {
        console.error('Error loading validated connections:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pii-scanner-connections', JSON.stringify(connections));
  }, [connections]);

  useEffect(() => {
    localStorage.setItem('pii-scanner-results', JSON.stringify(scanResults));
  }, [scanResults]);

  useEffect(() => {
    const scansObject = Object.fromEntries(activeScans);
    localStorage.setItem('pii-scanner-active-scans', JSON.stringify(scansObject));
  }, [activeScans]);

  useEffect(() => {
    localStorage.setItem('pii-scanner-validated-connections', JSON.stringify(Array.from(validatedConnections)));
  }, [validatedConnections]);

  const handleAddConnection = (connection: Connection) => {
    const newConnection = { ...connection, id: Date.now().toString() };
    setConnections(prev => [...prev, newConnection]);
    // Mark this connection as validated since it passed the test
    setValidatedConnections(prev => new Set(prev).add(newConnection.id));
  };

  const handleDeleteConnection = (id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id));
    setValidatedConnections(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    // Also remove any active scans for this connection
    setActiveScans(prev => {
      const newScans = new Map(prev);
      for (const [scanId, scan] of newScans) {
        if (scan.connectionId === id) {
          newScans.delete(scanId);
        }
      }
      return newScans;
    });
  };

  const handleStartScan = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) {
      toast({
        title: "Error",
        description: "Connection not found",
        variant: "destructive"
      });
      return;
    }

    // Check if connection was properly validated
    if (!validatedConnections.has(connectionId)) {
      toast({
        title: "Connection Not Validated",
        description: "This connection has not been tested successfully. Please test the connection before scanning.",
        variant: "destructive"
      });
      return;
    }

    // Check if there's already an active scan for this connection
    const existingActiveScan = Array.from(activeScans.values()).find(
      scan => scan.connectionId === connectionId && scan.status === 'running'
    );

    if (existingActiveScan) {
      toast({
        title: "Scan Already Running",
        description: "A scan is already running for this connection",
        variant: "destructive"
      });
      return;
    }

    const scanId = `scan-${Date.now()}`;
    const newScan = {
      id: scanId,
      connectionId,
      connectionName: connection.name,
      status: 'running',
      startTime: new Date(),
      progress: 0
    };

    setActiveScans(prev => new Map(prev.set(scanId, newScan)));

    toast({
      title: "Scan Started",
      description: `PII scan started for ${connection.name}`,
    });

    console.log(`Starting PII scan for connection: ${connection.name}`);
    console.log(`This would execute: piicatcher detect --source-name ${connection.name}`);

    // Note: In real implementation, this would call the actual piicatcher tool
    // For now, we'll not generate fake results - only real scan results should be shown
    toast({
      title: "Real Scan Required",
      description: "This would execute the actual piicatcher tool. No fake results will be generated.",
      variant: "destructive"
    });

    // Stop the fake scan immediately since we don't want fake results
    setTimeout(() => {
      setActiveScans(prev => {
        const newScans = new Map(prev);
        newScans.delete(scanId);
        return newScans;
      });
    }, 1000);
  };

  const handlePauseScan = (scanId: string) => {
    setActiveScans(prev => {
      const scan = prev.get(scanId);
      if (scan) {
        const updatedScan = { ...scan, status: 'paused' };
        toast({
          title: "Scan Paused",
          description: `Scan for ${scan.connectionName} has been paused`,
        });
        return new Map(prev.set(scanId, updatedScan));
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
