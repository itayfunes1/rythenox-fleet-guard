export interface Device {
  id: string;
  assetTag: string;
  assignedUser: string;
  department: string;
  osVersion: string;
  lastCheckIn: string;
  status: "online" | "idle" | "offline";
  ipAddress: string;
  model: string;
  cpuUsage: number;
  ramUsage: number;
  diskHealth: number;
}

export const devices: Device[] = [
  { id: "1", assetTag: "RYT-2024-001", assignedUser: "Sarah Chen", department: "Engineering", osVersion: "Windows 11 23H2", lastCheckIn: "2 min ago", status: "online", ipAddress: "10.0.1.45", model: "Dell Latitude 5540", cpuUsage: 34, ramUsage: 62, diskHealth: 98 },
  { id: "2", assetTag: "RYT-2024-002", assignedUser: "James Wilson", department: "Marketing", osVersion: "macOS Sonoma 14.3", lastCheckIn: "5 min ago", status: "online", ipAddress: "10.0.2.12", model: "MacBook Pro 14\"", cpuUsage: 22, ramUsage: 48, diskHealth: 95 },
  { id: "3", assetTag: "RYT-2024-003", assignedUser: "Maria Garcia", department: "Finance", osVersion: "Windows 11 23H2", lastCheckIn: "1 hr ago", status: "idle", ipAddress: "10.0.3.78", model: "HP EliteBook 840", cpuUsage: 8, ramUsage: 35, diskHealth: 92 },
  { id: "4", assetTag: "RYT-2024-004", assignedUser: "David Park", department: "Engineering", osVersion: "Ubuntu 22.04 LTS", lastCheckIn: "3 hr ago", status: "offline", ipAddress: "10.0.1.89", model: "Lenovo ThinkPad X1", cpuUsage: 0, ramUsage: 0, diskHealth: 88 },
  { id: "5", assetTag: "RYT-2024-005", assignedUser: "Emily Roberts", department: "HR", osVersion: "Windows 11 23H2", lastCheckIn: "10 min ago", status: "online", ipAddress: "10.0.4.22", model: "Dell Optiplex 7090", cpuUsage: 45, ramUsage: 71, diskHealth: 97 },
  { id: "6", assetTag: "RYT-2024-006", assignedUser: "Alex Thompson", department: "Design", osVersion: "macOS Sonoma 14.3", lastCheckIn: "30 min ago", status: "idle", ipAddress: "10.0.2.34", model: "MacBook Pro 16\"", cpuUsage: 12, ramUsage: 55, diskHealth: 94 },
  { id: "7", assetTag: "RYT-2024-007", assignedUser: "Lisa Chang", department: "Legal", osVersion: "Windows 11 23H2", lastCheckIn: "15 min ago", status: "online", ipAddress: "10.0.5.67", model: "HP ZBook Studio", cpuUsage: 28, ramUsage: 42, diskHealth: 99 },
  { id: "8", assetTag: "RYT-2024-008", assignedUser: "Michael Brown", department: "Sales", osVersion: "Windows 10 22H2", lastCheckIn: "2 days ago", status: "offline", ipAddress: "10.0.6.11", model: "Dell Latitude 7430", cpuUsage: 0, ramUsage: 0, diskHealth: 85 },
];

export interface ActivityItem {
  id: string;
  action: string;
  target: string;
  user: string;
  timestamp: string;
  type: "remote_session" | "deployment" | "update" | "diagnostic";
}

export const recentActivity: ActivityItem[] = [
  { id: "1", action: "Remote support session initiated", target: "RYT-2024-001", user: "Admin: John Miller", timestamp: "2 min ago", type: "remote_session" },
  { id: "2", action: "Software update deployed", target: "RYT-2024-005", user: "System", timestamp: "15 min ago", type: "update" },
  { id: "3", action: "Agent configuration deployed", target: "Engineering Dept (12 devices)", user: "Admin: Sarah Chen", timestamp: "1 hr ago", type: "deployment" },
  { id: "4", action: "Diagnostic report generated", target: "RYT-2024-003", user: "System", timestamp: "2 hr ago", type: "diagnostic" },
  { id: "5", action: "Remote session completed", target: "RYT-2024-007", user: "Admin: John Miller", timestamp: "3 hr ago", type: "remote_session" },
  { id: "6", action: "OS update pushed", target: "Finance Dept (8 devices)", user: "System", timestamp: "5 hr ago", type: "update" },
];

export interface DiagnosticFile {
  id: string;
  name: string;
  device: string;
  type: "pdf" | "log" | "mp4";
  size: string;
  date: string;
  category: "report" | "event_log" | "recording";
}

export const diagnosticFiles: DiagnosticFile[] = [
  { id: "1", name: "System_Health_RYT-2024-001.pdf", device: "RYT-2024-001", type: "pdf", size: "2.4 MB", date: "2024-03-15 09:30", category: "report" },
  { id: "2", name: "EventViewer_RYT-2024-003.log", device: "RYT-2024-003", type: "log", size: "856 KB", date: "2024-03-15 08:15", category: "event_log" },
  { id: "3", name: "Support_Session_RYT-2024-007.mp4", device: "RYT-2024-007", type: "mp4", size: "145 MB", date: "2024-03-14 14:22", category: "recording" },
  { id: "4", name: "Disk_Diagnostic_RYT-2024-004.pdf", device: "RYT-2024-004", type: "pdf", size: "1.8 MB", date: "2024-03-14 11:00", category: "report" },
  { id: "5", name: "Security_Audit_RYT-2024-005.log", device: "RYT-2024-005", type: "log", size: "1.2 MB", date: "2024-03-13 16:45", category: "event_log" },
  { id: "6", name: "Remote_Assist_RYT-2024-002.mp4", device: "RYT-2024-002", type: "mp4", size: "98 MB", date: "2024-03-13 10:30", category: "recording" },
  { id: "7", name: "Performance_RYT-2024-006.pdf", device: "RYT-2024-006", type: "pdf", size: "3.1 MB", date: "2024-03-12 09:00", category: "report" },
  { id: "8", name: "AppCrash_RYT-2024-008.log", device: "RYT-2024-008", type: "log", size: "445 KB", date: "2024-03-11 13:20", category: "event_log" },
];

export interface NetworkNode {
  id: string;
  name: string;
  type: "vpn_concentrator" | "management_gateway";
  status: "active" | "degraded" | "offline";
  connections: number;
  maxConnections: number;
  uptime: string;
  ip: string;
  location: string;
  throughput: string;
}

export const networkNodes: NetworkNode[] = [
  { id: "1", name: "VPN-EAST-01", type: "vpn_concentrator", status: "active", connections: 142, maxConnections: 500, uptime: "45d 12h", ip: "203.0.113.10", location: "US-East (Virginia)", throughput: "2.4 Gbps" },
  { id: "2", name: "VPN-WEST-01", type: "vpn_concentrator", status: "active", connections: 89, maxConnections: 500, uptime: "30d 8h", ip: "203.0.113.20", location: "US-West (Oregon)", throughput: "1.8 Gbps" },
  { id: "3", name: "VPN-EU-01", type: "vpn_concentrator", status: "degraded", connections: 234, maxConnections: 300, uptime: "15d 3h", ip: "198.51.100.10", location: "EU-West (Frankfurt)", throughput: "3.1 Gbps" },
  { id: "4", name: "MGMT-GW-01", type: "management_gateway", status: "active", connections: 45, maxConnections: 200, uptime: "60d 0h", ip: "192.168.1.1", location: "HQ Data Center", throughput: "10 Gbps" },
  { id: "5", name: "MGMT-GW-02", type: "management_gateway", status: "active", connections: 32, maxConnections: 200, uptime: "60d 0h", ip: "192.168.2.1", location: "DR Site", throughput: "10 Gbps" },
  { id: "6", name: "VPN-APAC-01", type: "vpn_concentrator", status: "offline", connections: 0, maxConnections: 300, uptime: "0d 0h", ip: "198.51.100.20", location: "APAC (Singapore)", throughput: "0 Gbps" },
];

export interface AuditLogEntry {
  id: string;
  action: string;
  admin: string;
  target: string;
  timestamp: string;
  consentShown: boolean;
  dataScope: string;
}

export const auditLog: AuditLogEntry[] = [
  { id: "1", action: "Remote Support Session", admin: "John Miller", target: "RYT-2024-001 (Sarah Chen)", timestamp: "2024-03-15 09:32:14", consentShown: true, dataScope: "CPU, RAM, Disk" },
  { id: "2", action: "Software Update Push", admin: "System (Automated)", target: "RYT-2024-005 (Emily Roberts)", timestamp: "2024-03-15 09:15:00", consentShown: true, dataScope: "System Updates" },
  { id: "3", action: "Diagnostic Collection", admin: "Sarah Chen", target: "RYT-2024-003 (Maria Garcia)", timestamp: "2024-03-15 08:00:00", consentShown: true, dataScope: "CPU, RAM, Disk" },
  { id: "4", action: "Remote Support Session", admin: "John Miller", target: "RYT-2024-007 (Lisa Chang)", timestamp: "2024-03-14 14:22:00", consentShown: true, dataScope: "CPU, RAM, Disk, Screen Share" },
  { id: "5", action: "Agent Deployment", admin: "Sarah Chen", target: "Engineering Dept (12 devices)", timestamp: "2024-03-14 10:00:00", consentShown: true, dataScope: "Agent Install" },
];
