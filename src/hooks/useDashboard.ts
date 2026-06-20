import {
  getDashboardStatistics,
  getDashboardTrend,
  getProjectReceiveProgress,
} from '@/services/wtu/dashboard.api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type DashboardTimeRange = 'all' | 'today' | 'month' | 'year' | 'custom';
export type DashboardTrendTimeRange = 'month' | 'year' | 'all' | 'custom';

type DashboardDateParams = {
  timeRange: DashboardTimeRange | DashboardTrendTimeRange;
  startDate?: string;
  endDate?: string;
};

const CHART_PARAMS = { timeRange: 'all' as const };

export const dashboardKeys = {
  root: ['dashboard'] as const,
  kpi: (params: DashboardDateParams) => ['dashboard', 'kpi', params] as const,
  charts: ['dashboard', 'charts'] as const,
  trend: (params: DashboardDateParams) => ['dashboard', 'trend', params] as const,
};

async function fetchDashboardKpi(params: DashboardDateParams) {
  const res = await getDashboardStatistics(params);
  return res.data.overview;
}

async function fetchDashboardCharts() {
  const [statsRes, progressRes] = await Promise.all([
    getDashboardStatistics(CHART_PARAMS),
    getProjectReceiveProgress(CHART_PARAMS),
  ]);
  return {
    distribution: statsRes.data.distribution,
    progress: progressRes.data,
  };
}

async function fetchDashboardTrend(params: DashboardDateParams) {
  const res = await getDashboardTrend(params);
  return res.data;
}

/** KPI 概览（随 KPI 时间筛选变化） */
export function useDashboardKpi(params: DashboardDateParams, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.kpi(params),
    queryFn: () => fetchDashboardKpi(params),
    enabled,
  });
}

/** 图表分布 + 项目收款进度（固定全量参数，低频变化） */
export function useDashboardCharts() {
  return useQuery({
    queryKey: dashboardKeys.charts,
    queryFn: fetchDashboardCharts,
    staleTime: 10 * 60 * 1000,
  });
}

/** 趋势数据（随趋势时间筛选变化） */
export function useDashboardTrend(params: DashboardDateParams, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.trend(params),
    queryFn: () => fetchDashboardTrend(params),
    enabled,
  });
}

/** 刷新仪表盘全部缓存 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: dashboardKeys.root });
}
