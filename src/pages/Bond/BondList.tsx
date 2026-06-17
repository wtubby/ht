import AttachmentIndicator from '@/components/AttachmentIndicator';
import ListToolbar from '@/components/ListToolbar';
import { MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import {
  bondTypeColors,
  getBondDisplayStatusColor,
  getBondTypeColor,
} from '@/constants/statusColors';
import { useBondPendingOptions, useRemoveBond } from '@/hooks';
import { getBonds } from '@/services/wtu/bond.api';
import { getErrorMessage } from '@/utils/apiError';
import { formatAmount, formatAmountOrDash } from '@/utils/format';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Badge, Tabs, Tag, Tooltip } from 'antd';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  flattenPendingBondRows,
  formatBondStatusLabel,
  type BondCreatePreset,
} from './bond.shared';
import BondPendingTable from './BondPendingTable';

type BondWithFiles = API.Bond & {
  has_files?: boolean;
};

interface BondListProps {
  onViewDetail: (record: BondWithFiles) => void;
  onEdit: (record: BondWithFiles) => void;
  onCreate: (preset?: BondCreatePreset) => void;
}

export interface BondListRef {
  reload: () => void;
  /** 登记成功后：切到全部台账并高亮该行 */
  focusCreatedBond: (bondId: number) => void;
}

const BondList = forwardRef<BondListRef, BondListProps>(
  ({ onViewDetail, onEdit, onCreate }, ref) => {
    const { message, modal } = App.useApp();
    const actionRef = useRef<ActionType>();
    const searchTextRef = useRef<string>('');
    const [listTab, setListTab] = useState<'all' | 'pending'>('all');
    const [highlightBondId, setHighlightBondId] = useState<number | null>(null);
    const scrollHighlightRef = useRef<number | null>(null);

    const removeMutation = useRemoveBond();
    const { data: pendingOptionsData } = useBondPendingOptions(true);

    const pendingCount = useMemo(() => {
      const list = (
        pendingOptionsData as { data?: { subContracts?: API.SubContract[] } } | undefined
      )?.data?.subContracts;
      return flattenPendingBondRows(list || []).length;
    }, [pendingOptionsData]);

    useEffect(() => {
      if (!highlightBondId) return undefined;
      const timer = window.setTimeout(() => setHighlightBondId(null), 5000);
      return () => window.clearTimeout(timer);
    }, [highlightBondId]);

    const focusCreatedBond = useCallback((bondId: number) => {
      setListTab('all');
      setHighlightBondId(bondId);
      scrollHighlightRef.current = bondId;
      searchTextRef.current = '';
      actionRef.current?.reload?.();
    }, []);

    useImperativeHandle(ref, () => ({
      reload: () => {
        actionRef.current?.reload();
      },
      focusCreatedBond,
    }));

    const handleRemove = async (selectedRow: BondWithFiles) => {
      if (!selectedRow) return true;

      try {
        await removeMutation.mutateAsync({ id: selectedRow.id! });
        message.success('删除成功');
        actionRef.current?.reload();
        return true;
      } catch (error) {
        message.error(getErrorMessage(error, '删除失败，请重试'));
        return false;
      }
    };

    const handleSearch = (value: string) => {
      searchTextRef.current = value;
      actionRef.current?.reload();
    };

    const columns: ProColumns<BondWithFiles>[] = [
      {
        title: 'ID',
        dataIndex: 'id',
        search: false,
        width: 30,
        align: 'center',
      },
      {
        title: '分包合同',
        dataIndex: ['subContract', 'contract_name'],
        width: 260,
        ellipsis: true,
        render: (_, record) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AttachmentIndicator
              visible={record.has_files}
              title="已上传担保文件"
              color={MODULE_COLORS.bond.color}
            />
            <a
              onClick={() => onViewDetail(record)}
              style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {record.subContract?.contract_name || '-'}
            </a>
          </div>
        ),
      },
      {
        title: '分包单位',
        dataIndex: ['subContract', 'partyC', 'company_name'],
        width: 160,
        ellipsis: true,
        search: false,
        render: (_, record) => record.subContract?.partyC?.company_name || '-',
      },
      {
        title: '担保类型',
        dataIndex: 'bond_type',
        valueEnum: bondTypeColors,
        width: 90,
        align: 'center',
        render: (_, record) => (
          <Tag color={getBondTypeColor(record.bond_type!)}>{record.bond_type}</Tag>
        ),
      },
      {
        title: '形式',
        dataIndex: 'bond_form',
        width: 60,
        align: 'center',
        search: false,
        render: (_, record) => record.bond_form || '-',
      },
      {
        title: '状态',
        dataIndex: 'display_status',
        width: 100,
        align: 'center',
        search: false,
        render: (_, record) => {
          const displayStatus = record.display_status || record.status;
          return (
            <Tag color={getBondDisplayStatusColor(record.bond_form, displayStatus)}>
              {formatBondStatusLabel(record.bond_form, displayStatus)}
            </Tag>
          );
        },
      },
      {
        title: '金额（元）',
        dataIndex: 'amount',
        search: false,
        align: 'right',
        width: 140,
        render: (text, record) => {
          const formatted = formatAmountOrDash(text);
          if (formatted === '-') return '-';
          const amount = Number(text);

          return (
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}
            >
              <span>{formatted}</span>
              {record.planned_amount != null &&
                record.planned_amount > 0 &&
                Math.abs(amount - record.planned_amount) >= 0.005 && (
                  <Tooltip title={`约定 ${formatAmount(record.planned_amount)} 元`}>
                    <Tag color="orange" style={{ margin: 0 }}>
                      偏差
                    </Tag>
                  </Tooltip>
                )}
              {record.bond_ratio != null && (
                <Tooltip title={`合同额的 ${record.bond_ratio}%`}>
                  <Tag
                    color="cyan"
                    style={{
                      margin: 0,
                      width: 30,
                      textAlign: 'center',
                      display: 'inline-block',
                      paddingInline: 4,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {record.bond_ratio}%
                  </Tag>
                </Tooltip>
              )}
            </div>
          );
        },
      },
      {
        title: '开立机构',
        dataIndex: 'organization',
        search: false,
        width: 120,
        ellipsis: true,
        render: (_, record) => record.organization || '-',
      },
      {
        title: '有效期',
        dataIndex: 'date_start',
        search: false,
        width: 170,
        align: 'center',
        render: (_, record) => {
          const startDate = record.date_start || '';
          const endDate = record.date_end || '';
          if (!startDate && !endDate) return '-';
          if (!startDate) return endDate;
          if (!endDate) return startDate;
          return `${startDate} ～ ${endDate}`;
        },
      },
      {
        title: '操作',
        dataIndex: 'option',
        valueType: 'option',
        width: 60,
        align: 'center',
        render: (_, record) => [
          <Tooltip key="edit" title="编辑">
            <EditOutlined
              style={{ fontSize: '16px', color: UI_COLORS.action, cursor: 'pointer' }}
              onClick={() => onEdit(record)}
            />
          </Tooltip>,
          <Tooltip key="delete" title="删除">
            <DeleteOutlined
              style={{
                fontSize: '16px',
                color: UI_COLORS.actionDanger,
                cursor: 'pointer',
                marginLeft: '12px',
              }}
              onClick={() => {
                modal.confirm({
                  title: '确认删除',
                  content: '您确定要删除该担保记录吗？',
                  onOk: () => handleRemove(record),
                });
              }}
            />
          </Tooltip>,
        ],
      },
    ];

    return (
      <PageContainer pageHeaderRender={false}>
        <style>{`
          .bond-list-row-highlight > td {
            background-color: ${MODULE_COLORS.bond.bg} !important;
          }
        `}</style>
        <Tabs
          activeKey={listTab}
          onChange={(key) => setListTab(key as 'all' | 'pending')}
          style={{ marginBottom: 0 }}
          items={[
            { key: 'all', label: '全部台账' },
            {
              key: 'pending',
              label: (
                <Badge count={pendingCount} size="small" offset={[10, 0]} showZero={false}>
                  <span>待登记</span>
                </Badge>
              ),
            },
          ]}
        />

        {listTab === 'pending' ? (
          <BondPendingTable onRegister={(preset) => onCreate(preset)} />
        ) : (
          <ProTable<BondWithFiles, API.PageParams>
            headerTitle="担保管理"
            actionRef={actionRef}
            rowKey="id"
            rowClassName={(record) =>
              record.id === highlightBondId ? 'bond-list-row-highlight' : ''
            }
            search={false}
            toolBarRender={() => [
              <ListToolbar
                key="toolbar"
                placeholder="搜索分包合同名称"
                createText="新建担保"
                onSearch={handleSearch}
                onCreate={() => onCreate()}
              />,
            ]}
            postData={(data: BondWithFiles[]) => {
              const scrollId = scrollHighlightRef.current;
              if (scrollId) {
                scrollHighlightRef.current = null;
                window.setTimeout(() => {
                  document
                    .querySelector(`tr[data-row-key="${scrollId}"]`)
                    ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }, 150);
              }
              return data;
            }}
            request={async (params) => {
              const response = await getBonds({
                page: params.current,
                pageSize: params.pageSize,
                search: searchTextRef.current || undefined,
              });
              return {
                data: response.data,
                success: response.success,
                total: response.total,
              };
            }}
            columns={columns}
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
            }}
            locale={{ emptyText: '还没有担保记录，请先有分包合同后再登记担保' }}
          />
        )}
      </PageContainer>
    );
  },
);

BondList.displayName = 'BondList';

export default BondList;
