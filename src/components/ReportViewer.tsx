
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Shield, Database, Search, Download, Eye, Calendar } from "lucide-react";
import { ScanResult } from "@/types/piiscanner";

interface ReportViewerProps {
  scanResults: ScanResult[];
}

const ReportViewer: React.FC<ReportViewerProps> = ({ scanResults }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'bg-red-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-white';
      case 'Low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'High': return <AlertTriangle className="h-4 w-4" />;
      case 'Medium': return <AlertTriangle className="h-4 w-4" />;
      case 'Low': return <Shield className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const filteredResults = scanResults.filter(result => {
    const matchesSearch = result.connectionName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'all' || result.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const generateMockDetails = (result: ScanResult) => {
    const piiTypes = ['Email', 'Phone', 'SSN', 'Credit Card', 'Name', 'Address', 'Date of Birth'];
    const details = [];
    
    for (let i = 0; i < result.piiFields; i++) {
      details.push({
        table: `table_${Math.floor(i / 5) + 1}`,
        column: `column_${i + 1}`,
        piiType: piiTypes[Math.floor(Math.random() * piiTypes.length)],
        confidence: Math.random() * 0.3 + 0.7, // 70-100%
        samples: [`sample_${i}_1`, `sample_${i}_2`]
      });
    }
    
    return details;
  };

  const exportReport = (result: ScanResult) => {
    const details = generateMockDetails(result);
    const reportData = {
      connection: result.connectionName,
      scanDate: result.scanDate,
      summary: {
        totalTables: result.totalTables,
        tablesWithPii: result.tablesWithPii,
        piiFields: result.piiFields,
        riskLevel: result.riskLevel
      },
      details
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pii-report-${result.connectionName}-${result.scanDate.toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">PII Scan Reports</h2>
        <p className="text-muted-foreground">Review and analyze PII findings from your database scans</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by connection name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by risk level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="High">High Risk</SelectItem>
                <SelectItem value="Medium">Medium Risk</SelectItem>
                <SelectItem value="Low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredResults.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
            <p className="text-muted-foreground">
              {scanResults.length === 0 
                ? "No scan reports available yet. Run your first scan to see results here."
                : "No reports match your current filters. Try adjusting your search criteria."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResults.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{result.connectionName}</CardTitle>
                  <Badge className={getRiskColor(result.riskLevel)}>
                    {getRiskIcon(result.riskLevel)}
                    <span className="ml-1">{result.riskLevel}</span>
                  </Badge>
                </div>
                <CardDescription className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{result.scanDate.toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Tables</span>
                      <div className="font-semibold">{result.totalTables}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">With PII</span>
                      <div className="font-semibold">{result.tablesWithPii}</div>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-muted-foreground">PII Fields Found</span>
                    <div className="font-semibold text-lg">{result.piiFields}</div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setSelectedResult(result)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>PII Scan Report - {result.connectionName}</DialogTitle>
                          <DialogDescription>
                            Detailed findings from scan performed on {result.scanDate.toLocaleDateString()}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 border rounded-lg">
                              <div className="text-2xl font-bold">{result.totalTables}</div>
                              <div className="text-sm text-muted-foreground">Total Tables</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">{result.tablesWithPii}</div>
                              <div className="text-sm text-muted-foreground">Tables with PII</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                              <div className="text-2xl font-bold text-red-600">{result.piiFields}</div>
                              <div className="text-sm text-muted-foreground">PII Fields</div>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                              <Badge className={getRiskColor(result.riskLevel)}>
                                {result.riskLevel} Risk
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold mb-3">Detailed Findings</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {generateMockDetails(result).slice(0, 10).map((detail, index) => (
                                <div key={index} className="border rounded p-3 text-sm">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <span className="font-medium">{detail.table}.{detail.column}</span>
                                      <Badge variant="secondary" className="ml-2">{detail.piiType}</Badge>
                                    </div>
                                    <span className="text-muted-foreground">
                                      {Math.round(detail.confidence * 100)}% confidence
                                    </span>
                                  </div>
                                  <div className="text-muted-foreground">
                                    Samples: {detail.samples.join(', ')}
                                  </div>
                                </div>
                              ))}
                              {result.piiFields > 10 && (
                                <div className="text-center text-muted-foreground py-2">
                                  ... and {result.piiFields - 10} more findings
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      size="sm"
                      onClick={() => exportReport(result)}
                      className="flex-1"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportViewer;
