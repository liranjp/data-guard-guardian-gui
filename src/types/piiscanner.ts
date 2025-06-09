
export interface Connection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  additionalParams?: Record<string, string>;
  createdAt: Date;
  lastScan?: Date;
}

export type DatabaseType = 
  | 'postgresql'
  | 'mysql'
  | 'sqlite3'
  | 'redshift'
  | 'athena'
  | 'snowflake'
  | 'bigquery';

export interface ScanResult {
  id: string;
  connectionId: string;
  connectionName: string;
  scanDate: Date;
  totalTables: number;
  tablesWithPii: number;
  piiFields: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  details?: PiiDetail[];
}

export interface PiiDetail {
  table: string;
  column: string;
  piiType: string;
  confidence: number;
  samples: string[];
}

export interface DatabaseConfig {
  type: DatabaseType;
  label: string;
  defaultPort: number;
  fields: ConnectionField[];
  icon: string;
}

export interface ConnectionField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'select';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}
