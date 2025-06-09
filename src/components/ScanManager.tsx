
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, Square, Clock, CheckCircle } from "lucide-react";
import { Connection } from "@/types/piiscanner";

interface ScanManagerProps {
  connections: Connection[];
  activeScans: Map<string, any>;
  onStartScan: (connectionId: string) => void;
  onPauseScan: (scanId: string) => void;
}

const ScanManager: React.FC<ScanManagerProps> = ({
  connections,
  activeScans,
  onStartScan,
  onPauseScan
}) => {
  const scansArray = Array.from(activeScans.values());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    const end = endTime || new Date();
    const diff = end.getTime() - startTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Scan Management</h2>
        <p className="text-muted-foreground">Monitor and control your PII scanning operations</p>
      </div>

      {/* Available Connections for Scanning */}
      <Card>
        <CardHeader>
          <CardTitle>Available Connections</CardTitle>
          <CardDescription>Start new scans on your configured database connections</CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No connections available. Add a connection first to start scanning.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((connection) => {
                const hasActiveScan = scansArray.some(scan => 
                  scan.connectionId === connection.id && 
                  (scan.status === 'running' || scan.status === 'paused')
                );
                
                return (
                  <div key={connection.id} className="border rounded-lg p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold">{connection.name}</h3>
                      <p className="text-sm text-muted-foreground">{connection.host}</p>
                    </div>
                    <Button
                      onClick={() => onStartScan(connection.id)}
                      disabled={hasActiveScan}
                      className="w-full"
                      size="sm"
                    >
                      {hasActiveScan ? (
                        <>
                          <Clock className="h-3 w-3 mr-2" />
                          Scan Active
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-2" />
                          Start Scan
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active and Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle>Scan History</CardTitle>
          <CardDescription>Track the progress and results of your PII scans</CardDescription>
        </CardHeader>
        <CardContent>
          {scansArray.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No scans have been started yet. Start your first scan above.
            </p>
          ) : (
            <div className="space-y-4">
              {scansArray
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                .map((scan) => (
                <div key={scan.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(scan.status)}`} />
                      <div>
                        <h3 className="font-semibold">{scan.connectionName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Started: {scan.startTime.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        {getStatusIcon(scan.status)}
                        <span className="capitalize">{scan.status}</span>
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(scan.startTime, scan.endTime)}
                      </span>
                    </div>
                  </div>

                  {scan.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(scan.progress)}%</span>
                      </div>
                      <Progress value={scan.progress} className="w-full" />
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    {scan.status === 'running' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPauseScan(scan.id)}
                      >
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </Button>
                    )}
                    {scan.status === 'paused' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStartScan(scan.connectionId)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Resume
                      </Button>
                    )}
                    {scan.status === 'completed' && (
                      <Badge variant="default" className="text-green-700 bg-green-100">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanManager;
