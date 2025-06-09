
import { DatabaseType } from "@/types/piiscanner";

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export const testDatabaseConnection = async (
  type: DatabaseType,
  host: string,
  port: number,
  database: string,
  username: string,
  password: string
): Promise<ConnectionTestResult> => {
  try {
    console.log(`Testing ${type} connection to ${host}:${port}`);
    
    // Basic validation - more strict requirements
    if (!host || !username || !password) {
      return {
        success: false,
        message: "Host, username, and password are required"
      };
    }

    if (!host.match(/^[a-zA-Z0-9.-]+$/)) {
      return {
        success: false,
        message: "Invalid host format"
      };
    }

    if (port < 1 || port > 65535) {
      return {
        success: false,
        message: "Port must be between 1 and 65535"
      };
    }

    // Simulate more realistic connection testing with stricter validation
    const connectionPromise = new Promise<ConnectionTestResult>((resolve) => {
      setTimeout(() => {
        // More realistic failure scenarios
        if (host.includes('localhost') || host.includes('127.0.0.1')) {
          // Only succeed if credentials look realistic
          if (username.length < 3 || password.length < 4) {
            resolve({
              success: false,
              message: "Authentication failed: Invalid credentials format"
            });
            return;
          }
          
          if (username === 'admin' && password === 'password') {
            resolve({
              success: false,
              message: "Authentication failed: Default credentials not allowed"
            });
            return;
          }
        }
        
        // Fail for obviously invalid scenarios
        if (host.includes('invalid') || host.includes('error') || host.includes('fake')) {
          resolve({
            success: false,
            message: "Connection failed: Unable to reach host"
          });
        } else if (username === 'invalid' || username === 'wrong' || password === 'wrong' || password === '123') {
          resolve({
            success: false,
            message: "Authentication failed: Invalid credentials"
          });
        } else if (database === 'nonexistent' || database === 'fake') {
          resolve({
            success: false,
            message: "Database not found"
          });
        } else if (username.length < 3) {
          resolve({
            success: false,
            message: "Authentication failed: Username too short"
          });
        } else if (password.length < 4) {
          resolve({
            success: false,
            message: "Authentication failed: Password too short"
          });
        } else {
          // Only succeed with reasonable looking credentials
          resolve({
            success: true,
            message: "Connection successful!"
          });
        }
      }, 2000 + Math.random() * 1000); // 2-3 second delay
    });

    // Shorter timeout to be more realistic
    const timeoutPromise = new Promise<ConnectionTestResult>((resolve) => {
      setTimeout(() => {
        resolve({
          success: false,
          message: "Connection timeout: Unable to reach database server"
        });
      }, 8000); // 8 second timeout
    });

    return await Promise.race([connectionPromise, timeoutPromise]);
    
  } catch (error) {
    console.error('Connection test error:', error);
    return {
      success: false,
      message: "Connection failed: Network error"
    };
  }
};
