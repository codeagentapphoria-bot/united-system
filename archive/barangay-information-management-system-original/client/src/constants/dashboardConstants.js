// Generate months and years for filters
export const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export const years = Array.from(
  { length: 5 },
  (_, i) => new Date().getFullYear() - i
);

// Color schemes for charts
export const chartColors = {
  primary: "#3b82f6",
  secondary: "#10b981",
  accent: "#8b5cf6",
  warning: "#f59e0b",
  danger: "#ef4444",
  success: "#22c55e",
  info: "#06b6d4",
};

export const pieColors = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#ec4899",
];

export const recentActivities = [
  {
    action: "New resident registered",
    time: "2 minutes ago",
    type: "success",
    icon: "Users",
  },
  {
    action: "Document archived",
    time: "15 minutes ago",
    type: "info",
    icon: "FileText",
  },
  {
    action: "Request submitted",
    time: "1 hour ago",
    type: "warning",
    icon: "MessageSquare",
  },
  {
    action: "Inventory updated",
    time: "2 hours ago",
    type: "info",
    icon: "Package",
  },
  {
    action: "User logged in",
    time: "3 hours ago",
    type: "success",
    icon: "Activity",
  },
];
