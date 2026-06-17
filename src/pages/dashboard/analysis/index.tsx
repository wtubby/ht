import { CHART_COLORS, COLORS, hexToRgba, MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import { FILE_MODULE_CONFIGS } from '@/constants/fileModuleConfig';
import {
  getDashboardStatistics,
  getDashboardTrend,
  getProjectReceiveProgress,
} from '@/services/wtu/dashboard.api';
import { getErrorMessage } from '@/utils/apiError';
import { getProgressBarWidthPct, isProgressOver, OVER_PROGRESS_COLOR } from '@/utils/format';
import {
  AuditOutlined,
  FileTextOutlined,
  FolderOutlined,
  InboxOutlined,
  PayCircleOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/plots';
import { PageContainer } from '@ant-design/pro-components';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  message,
  Progress,
  Radio,
  Row,
  Segmented,
  Skeleton,
  Tooltip,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';

const { RangePicker } = DatePicker;
const { Text } = Typography;

type TimeRange = 'all' | 'today' | 'month' | 'year' | 'custom';
type TrendTimeRange = 'month' | 'year' | 'all' | 'custom';
type TrendMetric = 'amount' | 'count';

const TREND_TYPE_LABEL: Record<string, string> = {
  day: '按日',
  month: '按月',
  year: '按年',
};

const TREND_SERIES = ['总包合同', '收款', '销项发票', '进项发票'] as const;
const TREND_SERIES_COLORS = [
  MODULE_COLORS.mainContract.color,
  MODULE_COLORS.receive.color,
  MODULE_COLORS.invoiceOut.color,
  MODULE_COLORS.invoiceIn.color,
];
const DEFAULT_TREND_SERIES: string[] = ['总包合同', '收款'];

const CARD_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: `1px solid ${COLORS.border}`,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};

// ─── 工具函数 ──────────────────────────────────────────────
const formatMoney = (v: number): string => {
  if (v >= 100000000) return `${(v / 100000000).toFixed(2)}亿`;
  if (v >= 10000) return `${(v / 10000).toFixed(2)}万`;
  return v.toFixed(2);
};
const fmt = (v: number) => `¥${formatMoney(v)}`;

const EMPTY_LABEL = '未设置';

const normalizeLabel = (value: unknown): string => {
  if (value == null || value === '') return EMPTY_LABEL;
  return String(value);
};

const fileModuleLabel = (code: unknown): string => {
  const key = code == null || code === '' ? '' : String(code);
  if (!key) return EMPTY_LABEL;
  return FILE_MODULE_CONFIGS[key]?.moduleName ?? key;
};

const toPieData = <T extends Record<string, any>>(
  items: T[] | undefined,
  labelKey: keyof T,
  labelMapper?: (raw: unknown) => string,
  valueKey: 'count' | 'total_amount' = 'count',
) => {
  const mapped = (items ?? []).map((item) => ({
    ...item,
    name: labelMapper ? labelMapper(item[labelKey]) : normalizeLabel(item[labelKey]),
    count: Number(item.count) || 0,
    total_amount: Number(item.total_amount) || 0,
  }));
  const total = mapped.reduce((sum, item) => sum + item[valueKey], 0);
  return mapped.map((item) => ({
    ...item,
    percent: total > 0 ? item[valueKey] / total : 0,
  }));
};

const BOND_STATUS_ORDER = ['担保中', '已退还', '已过期'];
const BOND_STATUS_PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.danger];

const PIE_LABEL = {
  text: (datum: { name?: string; percent?: number }) =>
    `${datum.name ?? EMPTY_LABEL} ${((datum.percent ?? 0) * 100).toFixed(0)}%`,
  style: { fontSize: 11, fill: COLORS.textSecondary },
};

type TrendPoint = { date: string; type: string; amount: number; count: number };

const toMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const parseMonthKey = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
};

const enumerateMonths = (startKey: string, endKey: string): string[] => {
  const months: string[] = [];
  const cur = parseMonthKey(startKey);
  const end = parseMonthKey(endKey);
  while (cur <= end) {
    months.push(toMonthKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
};

const getTrendMonthRange = (
  timeRange: TimeRange,
  customRange: [string, string] | null,
): [string, string] | null => {
  const now = new Date();
  const end = toMonthKey(now);
  switch (timeRange) {
    case 'year':
      return [`${now.getFullYear()}-01`, end];
    case 'all':
      return [`${now.getFullYear() - 4}-01`, end];
    case 'custom':
      if (customRange) {
        return [customRange[0].slice(0, 7), customRange[1].slice(0, 7)];
      }
      return [`${now.getFullYear() - 4}-01`, end];
    default:
      return null;
  }
};

const toDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseDayKey = (key: string) => {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(y, m - 1, day);
};

const enumerateDays = (startKey: string, endKey: string): string[] => {
  const days: string[] = [];
  const cur = parseDayKey(startKey);
  const end = parseDayKey(endKey);
  while (cur <= end) {
    days.push(toDayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

const getTrendDayRange = (
  timeRange: TrendTimeRange,
  customRange: [string, string] | null,
): [string, string] | null => {
  const now = new Date();
  switch (timeRange) {
    case 'month':
      return [toDayKey(new Date(now.getFullYear(), now.getMonth(), 1)), toDayKey(now)];
    case 'custom':
      return customRange;
    default:
      return null;
  }
};

/** 补全缺失日期/月份，使折线连续 */
const fillTrendGaps = (
  data: TrendPoint[],
  range: [string, string] | null,
  enumerate: (start: string, end: string) => string[],
): TrendPoint[] => {
  if (!range || data.length === 0) return data;
  const [rangeStart, rangeEnd] = range;
  const types = [...new Set(data.map((d) => d.type))];
  const dataMap = new Map(data.map((d) => [`${d.date}|${d.type}`, d]));
  const periods = enumerate(rangeStart, rangeEnd);
  return periods.flatMap((date) =>
    types.map((type) => dataMap.get(`${date}|${type}`) ?? { date, type, amount: 0, count: 0 }),
  );
};

const fillMonthlyTrendGaps = (data: TrendPoint[], range: [string, string] | null) =>
  fillTrendGaps(data, range, enumerateMonths);

const fillDailyTrendGaps = (data: TrendPoint[], range: [string, string] | null) =>
  fillTrendGaps(data, range, enumerateDays);

const formatTrendAxisLabel = (date: string, trendType?: string) => {
  if (trendType === 'month' && /^\d{4}-\d{2}$/.test(date)) {
    const [year, month] = date.split('-');
    return month === '01' ? `${year}-${month}` : month;
  }
  if (trendType === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date.slice(5);
  }
  return date;
};

const formatTrendTooltipTitle = (date: string, trendType?: string) => {
  if (trendType === 'month' && /^\d{4}-\d{2}$/.test(date)) {
    const [year, month] = date.split('-');
    return `${year}年${Number(month)}月`;
  }
  return date;
};

/** 根据时间筛选推导粒度说明（无数据时也能展示） */
const resolveTrendTypeHint = (
  timeRange: TrendTimeRange,
  customRange: [string, string] | null,
): string => {
  switch (timeRange) {
    case 'month':
      return 'day';
    case 'year':
    case 'all':
      return 'month';
    case 'custom':
      if (customRange) {
        const start = new Date(customRange[0]);
        const end = new Date(customRange[1]);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        return diffDays <= 31 ? 'day' : 'month';
      }
      return 'month';
    default:
      return 'month';
  }
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

// ─── KPI 卡片 ─────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  icon: React.ReactNode;
  color: { color: string; bg: string };
  mainValue: React.ReactNode;
  mainSuffix?: string;
  subItems?: Array<{ label: string; value: string; valueStyle?: React.CSSProperties }>;
  extra?: React.ReactNode;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  icon,
  color,
  mainValue,
  mainSuffix,
  subItems,
  extra,
}) => (
  <Card style={{ ...CARD_STYLE, height: '100%' }} styles={{ body: { padding: '12px 16px' } }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          flexShrink: 0,
          background: color.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
          color: color.color,
        }}
      >
        {icon}
      </div>
      {extra}
    </div>
    <div style={{ marginTop: 8 }}>
      <Text type="secondary" style={{ fontSize: 13 }}>
        {title}
      </Text>
      <div style={{ marginTop: 3, display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, lineHeight: 1 }}>
          {mainValue}
        </span>
        {mainSuffix && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {mainSuffix}
          </Text>
        )}
      </div>
    </div>
    {subItems && (
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {subItems.map((item) => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.label}
            </Text>
            <Text style={{ fontSize: 12, color: color.color, fontWeight: 600, ...item.valueStyle }}>
              {item.value}
            </Text>
          </div>
        ))}
      </div>
    )}
  </Card>
);

const KpiSkeleton: React.FC = () => (
  <Card style={{ ...CARD_STYLE, height: '100%' }} styles={{ body: { padding: '12px 16px' } }}>
    <Skeleton active paragraph={{ rows: 3 }} title={false} />
  </Card>
);

// ─── 空状态占位 ───────────────────────────────────────────
const ChartEmpty: React.FC<{ height?: number }> = ({ height = 220 }) => (
  <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Text type="secondary">暂无数据</Text>
  </div>
);

// ─── 主组件 ───────────────────────────────────────────────
const CHART_PARAMS = { timeRange: 'all' as const };

const Analysis: React.FC = () => {
  const [kpiLoading, setKpiLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);
  const [trendTimeRange, setTrendTimeRange] = useState<TrendTimeRange>('year');
  const [trendCustomRange, setTrendCustomRange] = useState<[string, string] | null>(null);
  const [overview, setOverview] = useState<API.DashboardStatistics['overview'] | null>(null);
  const [distribution, setDistribution] = useState<API.DashboardStatistics['distribution'] | null>(
    null,
  );
  const [trendData, setTrendData] = useState<API.DashboardTrend | null>(null);
  const [progress, setProgress] = useState<API.ProjectReceiveProgress[]>([]);
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('amount');
  const [trendSeries, setTrendSeries] = useState<string[]>(DEFAULT_TREND_SERIES);

  const buildKpiParams = () => {
    const p: { timeRange: TimeRange; startDate?: string; endDate?: string } = { timeRange };
    if (timeRange === 'custom' && customRange) {
      p.startDate = customRange[0];
      p.endDate = customRange[1];
    }
    return p;
  };

  const canLoadKpi = timeRange !== 'custom' || customRange !== null;

  const buildTrendParams = () => {
    const p: { timeRange: TrendTimeRange; startDate?: string; endDate?: string } = {
      timeRange: trendTimeRange,
    };
    if (trendTimeRange === 'custom' && trendCustomRange) {
      p.startDate = trendCustomRange[0];
      p.endDate = trendCustomRange[1];
    }
    return p;
  };

  const canLoadTrend = trendTimeRange !== 'custom' || trendCustomRange !== null;

  const loadKpi = async () => {
    if (!canLoadKpi) return;
    try {
      setKpiLoading(true);
      const res = await getDashboardStatistics(buildKpiParams());
      if (res.success) setOverview(res.data.overview);
    } catch (error) {
      message.error(getErrorMessage(error, '加载 KPI 数据失败'));
    } finally {
      setKpiLoading(false);
    }
  };

  const loadTrend = async () => {
    if (!canLoadTrend) return;
    try {
      setTrendLoading(true);
      const res = await getDashboardTrend(buildTrendParams());
      if (res.success) setTrendData(res.data);
    } catch (error) {
      message.error(getErrorMessage(error, '加载趋势数据失败'));
    } finally {
      setTrendLoading(false);
    }
  };

  const loadCharts = async () => {
    try {
      setChartLoading(true);
      const [statsRes, progressRes] = await Promise.all([
        getDashboardStatistics(CHART_PARAMS),
        getProjectReceiveProgress(CHART_PARAMS),
      ]);
      if (statsRes.success) setDistribution(statsRes.data.distribution);
      if (progressRes.success) setProgress(progressRes.data);
    } catch (error) {
      message.error(getErrorMessage(error, '加载图表数据失败'));
    } finally {
      setChartLoading(false);
    }
  };

  const loadAll = () => Promise.all([loadKpi(), loadCharts(), loadTrend()]);

  useEffect(() => {
    loadCharts();
    loadTrend();
  }, []);
  useEffect(() => {
    loadKpi();
  }, [timeRange, customRange]);
  useEffect(() => {
    if (!canLoadTrend) {
      if (trendTimeRange === 'custom') setTrendData(null);
      return;
    }
    loadTrend();
  }, [trendTimeRange, trendCustomRange]);

  const loading = kpiLoading || chartLoading || trendLoading;

  const bondStatusPie = toPieData(
    distribution?.bondStatus,
    'bond_status',
    undefined,
    'total_amount',
  )
    .sort((a, b) => {
      const ai = BOND_STATUS_ORDER.indexOf(a.name);
      const bi = BOND_STATUS_ORDER.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map((item) => ({
      ...item,
      tooltip_value: `¥${formatMoney(item.total_amount)}（${item.count}笔）`,
    }));
  const mainContractStatusPie = toPieData(distribution?.mainContractStatus, 'contract_status');
  const subContractTypePie = toPieData(distribution?.subContractType, 'contract_type');
  const fileModulePie = toPieData(distribution?.fileModule, 'file_module', fileModuleLabel);

  const mapTrend = (rows: any[] | undefined, type: string) =>
    (rows ?? [])
      .filter((d) => d.date != null && d.date !== '')
      .map((d) => ({
        date: String(d.date),
        type,
        amount: d.amount ? Math.round(Number(d.amount) / 10000) : 0,
        count: Number(d.count) || 0,
      }));

  // 趋势图数据
  const rawTrendChartData: TrendPoint[] = trendData
    ? [
        ...mapTrend(trendData.contractTrend, '总包合同'),
        ...mapTrend(trendData.receiveTrend, '收款'),
        ...mapTrend(trendData.invoiceOutTrend, '销项发票'),
        ...mapTrend(trendData.invoiceInTrend, '进项发票'),
      ]
    : [];

  const trendChartData = (() => {
    if (!trendData) return [];
    if (trendData.type === 'month') {
      return fillMonthlyTrendGaps(
        rawTrendChartData,
        getTrendMonthRange(trendTimeRange, trendCustomRange),
      );
    }
    if (trendData.type === 'day') {
      return fillDailyTrendGaps(
        rawTrendChartData,
        getTrendDayRange(trendTimeRange, trendCustomRange),
      );
    }
    return rawTrendChartData;
  })();

  const filteredTrendChartData = trendChartData.filter((d) => trendSeries.includes(d.type));
  const trendTypeHint = trendData?.type ?? resolveTrendTypeHint(trendTimeRange, trendCustomRange);

  return (
    <PageContainer
      header={{
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-block',
                width: 4,
                height: 18,
                background: `linear-gradient(180deg, ${COLORS.primary}, ${hexToRgba(COLORS.primary, 0.55)})`,
                borderRadius: 2,
              }}
            />
            数据分析大屏
          </div>
        ),
        breadcrumb: {},
        extra: (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              KPI 统计：
            </Text>
            <Radio.Group
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="today">今日</Radio.Button>
              <Radio.Button value="month">本月</Radio.Button>
              <Radio.Button value="year">本年</Radio.Button>
              <Radio.Button value="all">全部</Radio.Button>
              <Radio.Button value="custom">自定义</Radio.Button>
            </Radio.Group>
            {timeRange === 'custom' && (
              <RangePicker
                onChange={(dates) => {
                  if (dates) {
                    setCustomRange([
                      dates[0]!.format('YYYY-MM-DD'),
                      dates[1]!.format('YYYY-MM-DD'),
                    ]);
                  } else {
                    setCustomRange(null);
                  }
                }}
              />
            )}
            <Tooltip title="刷新数据">
              <Button icon={<ReloadOutlined />} onClick={loadAll} loading={loading} />
            </Tooltip>
          </div>
        ),
      }}
    >
      {/* ══ 第一行：6 个 KPI 卡片 ═══════════════════════════════ */}
      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
        <Col xs={24} sm={12} md={8} xl={4}>
          {!overview || kpiLoading ? (
            <KpiSkeleton />
          ) : (
            <KpiCard
              title="总包合同"
              icon={<FileTextOutlined />}
              color={MODULE_COLORS.mainContract}
              mainValue={overview.mainContract.count}
              mainSuffix="个"
              subItems={[
                { label: '合同金额', value: fmt(overview.mainContract.totalAmount) },
                { label: '结算金额', value: fmt(overview.mainContract.settlementAmount) },
              ]}
            />
          )}
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          {!overview || kpiLoading ? (
            <KpiSkeleton />
          ) : (
            <KpiCard
              title="收款情况"
              icon={<PayCircleOutlined />}
              color={MODULE_COLORS.receive}
              mainValue={fmt(overview.receive.totalAmount)}
              subItems={[
                { label: '收款笔数', value: `${overview.receive.count} 笔` },
                {
                  label: '收款率',
                  value: `${overview.receive.receiveRate}%`,
                  valueStyle: isProgressOver(overview.receive.receiveRate)
                    ? { color: OVER_PROGRESS_COLOR, fontWeight: 400 }
                    : undefined,
                },
              ]}
              extra={
                <Tooltip
                  title={isProgressOver(overview.receive.receiveRate) ? '已超合同金额' : undefined}
                >
                  <Progress
                    type="circle"
                    percent={getProgressBarWidthPct(overview.receive.receiveRate)}
                    size={40}
                    strokeColor={
                      isProgressOver(overview.receive.receiveRate)
                        ? OVER_PROGRESS_COLOR
                        : COLORS.success
                    }
                    format={() => (
                      <span
                        style={{
                          fontSize: 9,
                          color: isProgressOver(overview.receive.receiveRate)
                            ? OVER_PROGRESS_COLOR
                            : COLORS.success,
                          fontWeight: 400,
                          lineHeight: 1.2,
                        }}
                      >
                        {overview.receive.receiveRate}%
                      </span>
                    )}
                  />
                </Tooltip>
              }
            />
          )}
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          {!overview || kpiLoading ? (
            <KpiSkeleton />
          ) : (
            <KpiCard
              title="销项发票"
              icon={<AuditOutlined />}
              color={MODULE_COLORS.invoiceOut}
              mainValue={fmt(overview.invoiceOut.totalAmount)}
              subItems={[{ label: '已开具', value: `${overview.invoiceOut.count} 张` }]}
            />
          )}
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          {!overview || kpiLoading ? (
            <KpiSkeleton />
          ) : (
            <KpiCard
              title="分包合同"
              icon={<TeamOutlined />}
              color={MODULE_COLORS.subContract}
              mainValue={overview.subContract.count}
              mainSuffix="个"
              subItems={[
                { label: '合同金额', value: fmt(overview.subContract.totalAmount) },
                { label: '结算金额', value: fmt(overview.subContract.settlementAmount) },
              ]}
            />
          )}
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          {!overview || kpiLoading ? (
            <KpiSkeleton />
          ) : (
            <KpiCard
              title="进项发票"
              icon={<InboxOutlined />}
              color={MODULE_COLORS.invoiceIn}
              mainValue={fmt(overview.invoiceIn.totalAmount)}
              subItems={[{ label: '已收到', value: `${overview.invoiceIn.count} 张` }]}
            />
          )}
        </Col>

        <Col xs={24} sm={12} md={8} xl={4}>
          {!overview || kpiLoading ? (
            <KpiSkeleton />
          ) : (
            <KpiCard
              title="文件管理"
              icon={<FolderOutlined />}
              color={MODULE_COLORS.file}
              mainValue={overview.file.count}
              mainSuffix="个"
              subItems={[{ label: '文件总大小', value: formatFileSize(overview.file.totalSize) }]}
            />
          )}
        </Col>
      </Row>

      {/* ══ 第二行：趋势图 + 担保状态分布 ═══════════════════════ */}
      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
        {/* 趋势图 */}
        <Col xs={24} lg={16}>
          <Card
            style={CARD_STYLE}
            styles={{ body: { padding: '12px 16px 8px' } }}
            title={<span style={{ fontWeight: 600, fontSize: 14 }}>金额趋势分析</span>}
            extra={
              <Segmented
                size="small"
                value={trendMetric}
                onChange={(v) => setTrendMetric(v as TrendMetric)}
                options={[
                  { label: '金额', value: 'amount' },
                  { label: '笔数', value: 'count' },
                ]}
              />
            }
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px 12px',
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {TREND_TYPE_LABEL[trendTypeHint] || trendTypeHint}·
                  {trendMetric === 'amount' ? '万元' : '笔'}
                </Text>
                <Checkbox.Group
                  value={trendSeries}
                  options={TREND_SERIES.map((name, i) => ({
                    label: (
                      <span
                        style={{ fontSize: 12, color: TREND_SERIES_COLORS[i], fontWeight: 500 }}
                      >
                        {name}
                      </span>
                    ),
                    value: name,
                  }))}
                  onChange={(values) => {
                    if ((values as string[]).length === 0) return;
                    setTrendSeries(values as string[]);
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <Radio.Group
                  size="small"
                  value={trendTimeRange}
                  onChange={(e) => setTrendTimeRange(e.target.value)}
                  optionType="button"
                >
                  <Radio.Button value="month">本月</Radio.Button>
                  <Radio.Button value="year">本年</Radio.Button>
                  <Radio.Button value="all">近5年</Radio.Button>
                  <Radio.Button value="custom">自定义</Radio.Button>
                </Radio.Group>
                {trendTimeRange === 'custom' && (
                  <RangePicker
                    size="small"
                    onChange={(dates) => {
                      if (dates) {
                        setTrendCustomRange([
                          dates[0]!.format('YYYY-MM-DD'),
                          dates[1]!.format('YYYY-MM-DD'),
                        ]);
                      } else {
                        setTrendCustomRange(null);
                      }
                    }}
                  />
                )}
              </div>
            </div>
            {trendTimeRange === 'custom' && !trendCustomRange ? (
              <ChartEmpty height={280} />
            ) : trendLoading || !trendData ? (
              <Skeleton active paragraph={{ rows: 7 }} title={false} />
            ) : trendChartData.length === 0 || filteredTrendChartData.length === 0 ? (
              <ChartEmpty height={280} />
            ) : (
              <Line
                data={filteredTrendChartData}
                xField="date"
                yField={trendMetric}
                colorField="type"
                height={280}
                color={TREND_SERIES_COLORS}
                scale={{ color: { domain: [...TREND_SERIES] } }}
                style={{ lineWidth: 2 }}
                point={{ shapeField: 'circle', sizeField: 3 }}
                legend={false}
                yAxis={{
                  label: {
                    formatter: (v: string) => (trendMetric === 'amount' ? `${v}万` : v),
                    style: { fill: COLORS.textTertiary, fontSize: 11 },
                  },
                  grid: { line: { style: { stroke: COLORS.border, lineDash: [4, 4] } } },
                }}
                xAxis={{
                  label: {
                    autoRotate: false,
                    autoHide: true,
                    formatter: (v: string) => formatTrendAxisLabel(v, trendData?.type),
                    style: { fill: COLORS.textTertiary, fontSize: 11 },
                  },
                }}
                interaction={{
                  elementHighlight: true,
                  tooltip: {
                    render: (
                      _: unknown,
                      {
                        title,
                        items,
                      }: {
                        title: string;
                        items: Array<{ name: string; value: number; color: string }>;
                      },
                    ) => (
                      <div style={{ padding: '8px 12px', minWidth: 140 }}>
                        <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                          {formatTrendTooltipTitle(title, trendData?.type)}
                        </div>
                        {items.map((item) => {
                          const row = filteredTrendChartData.find(
                            (d) => d.date === title && d.type === item.name,
                          );
                          const amount = row?.amount ?? (Number(item.value) || 0);
                          const count = row?.count ?? 0;
                          const displayValue =
                            trendMetric === 'amount'
                              ? `¥${amount.toFixed(1)}万（${count}笔）`
                              : `${count}笔`;
                          return (
                            <div
                              key={item.name}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginTop: 4,
                                fontSize: 12,
                              }}
                            >
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: item.color,
                                  flexShrink: 0,
                                }}
                              />
                              <span>{item.name}</span>
                              <span style={{ marginLeft: 'auto', fontWeight: 600 }}>
                                {displayValue}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ),
                  },
                }}
              />
            )}
          </Card>
        </Col>

        {/* 右侧：担保状态分布 */}
        <Col xs={24} lg={8}>
          <Card
            style={{ ...CARD_STYLE, height: '100%' }}
            styles={{ body: { padding: '16px 20px' } }}
            title={<span style={{ fontWeight: 600, fontSize: 14 }}>担保状态分布</span>}
          >
            {!distribution ? (
              <Skeleton active paragraph={{ rows: 7 }} title={false} />
            ) : bondStatusPie.length > 0 ? (
              <Pie
                data={bondStatusPie}
                angleField="total_amount"
                colorField="name"
                radius={0.85}
                innerRadius={0.65}
                height={280}
                scale={{ color: { domain: BOND_STATUS_ORDER, range: BOND_STATUS_PIE_COLORS } }}
                label={PIE_LABEL}
                statistic={{
                  title: {
                    content: '总计',
                    style: { fontSize: 14, color: COLORS.textTertiary, lineHeight: '1.5' },
                  },
                  content: {
                    content: `¥${formatMoney(bondStatusPie.reduce((s, i) => s + i.total_amount, 0))}`,
                    style: { fontSize: 16, fontWeight: 600, color: COLORS.text },
                  },
                }}
                legend={{ position: 'bottom', itemName: { style: { fontSize: 11 } } }}
                interactions={[{ type: 'element-active' }]}
                tooltip={{
                  title: 'name',
                  items: [{ field: 'tooltip_value', name: '担保金额' }],
                }}
              />
            ) : (
              <ChartEmpty height={280} />
            )}
          </Card>
        </Col>
      </Row>

      {/* ══ 第三行：三个分布饼图 ════════════════════════════════ */}
      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
        {/* 总包合同状态 */}
        <Col xs={24} lg={8}>
          <Card
            style={CARD_STYLE}
            styles={{ body: { padding: '16px 20px' } }}
            title={<span style={{ fontWeight: 600, fontSize: 14 }}>总包合同状态分布</span>}
          >
            {!distribution ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : mainContractStatusPie.length > 0 ? (
              <Pie
                data={mainContractStatusPie}
                angleField="count"
                colorField="name"
                radius={0.85}
                innerRadius={0.65}
                height={220}
                color={[COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger]}
                label={PIE_LABEL}
                statistic={{
                  title: {
                    content: '总计',
                    style: { fontSize: 14, color: COLORS.textTertiary, lineHeight: '1.5' },
                  },
                  content: {
                    content: `${mainContractStatusPie.reduce((s, i) => s + i.count, 0)}个`,
                    style: { fontSize: 20, fontWeight: 600, color: COLORS.text },
                  },
                }}
                legend={{ position: 'bottom', itemName: { style: { fontSize: 11 } } }}
                interactions={[{ type: 'element-active' }]}
                tooltip={{ formatter: (d: any) => ({ name: d.name, value: `${d.count}个` }) }}
              />
            ) : (
              <ChartEmpty />
            )}
          </Card>
        </Col>

        {/* 分包合同类型 */}
        <Col xs={24} lg={8}>
          <Card
            style={CARD_STYLE}
            styles={{ body: { padding: '16px 20px' } }}
            title={<span style={{ fontWeight: 600, fontSize: 14 }}>分包合同类型分布</span>}
          >
            {!distribution ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : subContractTypePie.length > 0 ? (
              <Pie
                data={subContractTypePie}
                angleField="count"
                colorField="name"
                radius={0.85}
                innerRadius={0.65}
                height={220}
                color={[
                  CHART_COLORS.categorical[3],
                  CHART_COLORS.categorical[5],
                  UI_COLORS.warningText,
                  CHART_COLORS.categorical[6],
                ]}
                label={PIE_LABEL}
                statistic={{
                  title: {
                    content: '总计',
                    style: { fontSize: 14, color: COLORS.textTertiary, lineHeight: '1.5' },
                  },
                  content: {
                    content: `${subContractTypePie.reduce((s, i) => s + i.count, 0)}个`,
                    style: { fontSize: 20, fontWeight: 600, color: COLORS.text },
                  },
                }}
                legend={{ position: 'bottom', itemName: { style: { fontSize: 11 } } }}
                interactions={[{ type: 'element-active' }]}
                tooltip={{ formatter: (d: any) => ({ name: d.name, value: `${d.count}个` }) }}
              />
            ) : (
              <ChartEmpty />
            )}
          </Card>
        </Col>

        {/* 文件模块分布（新增） */}
        <Col xs={24} lg={8}>
          <Card
            style={CARD_STYLE}
            styles={{ body: { padding: '16px 20px' } }}
            title={<span style={{ fontWeight: 600, fontSize: 14 }}>文件模块分布</span>}
          >
            {!distribution ? (
              <Skeleton active paragraph={{ rows: 5 }} title={false} />
            ) : fileModulePie.length > 0 ? (
              <Pie
                data={fileModulePie}
                angleField="count"
                colorField="name"
                radius={0.85}
                innerRadius={0.65}
                height={220}
                color={CHART_COLORS.categorical}
                label={PIE_LABEL}
                statistic={{
                  title: {
                    content: '总计',
                    style: { fontSize: 14, color: COLORS.textTertiary, lineHeight: '1.5' },
                  },
                  content: {
                    content: `${fileModulePie.reduce((s, i) => s + i.count, 0)}个`,
                    style: { fontSize: 20, fontWeight: 600, color: COLORS.text },
                  },
                }}
                legend={{ position: 'bottom', itemName: { style: { fontSize: 11 } } }}
                interactions={[{ type: 'element-active' }]}
                tooltip={{ formatter: (d: any) => ({ name: d.name, value: `${d.count}个` }) }}
              />
            ) : (
              <ChartEmpty />
            )}
          </Card>
        </Col>
      </Row>

      {/* ══ 第四行：项目收款进度（响应时间筛选）════════════════ */}
      <Card
        style={CARD_STYLE}
        styles={{ body: { padding: '16px 20px' } }}
        title={<span style={{ fontWeight: 600, fontSize: 14 }}>项目收款进度</span>}
        extra={<Badge count={progress.length} showZero color={COLORS.primary} />}
      >
        {loading && progress.length === 0 ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        ) : progress.length === 0 ? (
          <ChartEmpty height={80} />
        ) : (
          <Row gutter={[24, 14]}>
            {progress.map((item) => {
              const isOver = isProgressOver(item.receiveRate);
              const color = isOver
                ? OVER_PROGRESS_COLOR
                : item.receiveRate >= 80
                  ? COLORS.primary
                  : item.receiveRate >= 60
                    ? COLORS.success
                    : item.receiveRate >= 40
                      ? COLORS.warning
                      : COLORS.danger;
              return (
                <Col xs={24} sm={12} xl={8} key={item.id}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}
                  >
                    <Tooltip title={item.projectName}>
                      <Text
                        style={{
                          fontSize: 12,
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                      >
                        {normalizeLabel(item.projectName)}
                      </Text>
                    </Tooltip>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {fmt(item.receivedAmount)}/{fmt(item.totalAmount)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: isOver ? 400 : 600,
                          color,
                          minWidth: 36,
                          textAlign: 'right',
                        }}
                      >
                        {item.receiveRate}%
                      </Text>
                    </div>
                  </div>
                  <Tooltip title={isOver ? '已超合同金额' : undefined}>
                    <Progress
                      percent={getProgressBarWidthPct(item.receiveRate)}
                      showInfo={false}
                      strokeColor={color}
                      trailColor={COLORS.bgHover}
                      size={['100%', 5] as any}
                    />
                  </Tooltip>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>
    </PageContainer>
  );
};

export default Analysis;
