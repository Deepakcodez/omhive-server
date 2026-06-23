export type Activity = {
  syncId: string;
  startTime: Date | string;
  endTime: Date | string;
  duration: number;
  activityType: "work" | "break";
  software: string;
  title: string;
  hostname: string;
  systemUsername: string;
  userId: string;
  attendanceId: string;
};

export type ActivityFilters = {
  userId?: string;
  attendanceId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number
};

export type ActivityDateFilters = {
  date: string;
  userId?: string;
  attendanceId?: string;
  limit?: number;
  page: number
};
