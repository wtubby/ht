import { apiGet } from './client';

/** 获取仪表盘统计数据 GET /api/dashboard/statistics */
export async function getDashboardStatistics(
  params: {
    timeRange?: 'all' | 'today' | 'month' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
  },
  options?: { [key: string]: any },
) {
  return apiGet<{
    success: boolean;
    data: API.DashboardStatistics;
  }>('/api/dashboard/statistics', params, options);
}

/** 获取趋势数据 GET /api/dashboard/trend */
export async function getDashboardTrend(
  params: {
    timeRange?: 'all' | 'today' | 'month' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
  },
  options?: { [key: string]: any },
) {
  return apiGet<{
    success: boolean;
    data: API.DashboardTrend;
  }>('/api/dashboard/trend', params, options);
}

/** 获取项目收款进度 GET /api/dashboard/project-receive-progress */
export async function getProjectReceiveProgress(
  params: {
    timeRange?: 'all' | 'today' | 'month' | 'year' | 'custom';
    startDate?: string;
    endDate?: string;
    limit?: number;
  },
  options?: { [key: string]: any },
) {
  return apiGet<{
    success: boolean;
    data: API.ProjectReceiveProgress[];
  }>('/api/dashboard/project-receive-progress', params, options);
}
