import { COLORS, UI_COLORS } from '@/constants/colors';
import {
  getBondDisplayStatusHex,
  getContractStatusColor,
  getContractTypeColor,
} from '@/constants/statusColors';
import { fetchMainContractsQuery, fetchSubContractsQuery } from '@/hooks';
import { BOND_TYPE_ICONS } from '@/pages/Bond/bond.shared';
import MainContractDetail from '@/pages/MainContract/MainContractDetail';
import SubContractDetail from '@/pages/SubContract/SubContractDetail';
import { getErrorMessage } from '@/utils/apiError';
import { formatAmountOrDash, renderAmountWithPercentage } from '@/utils/format';
import { PlusCircleOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Spin, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const { Title } = Typography;

const LIST_PAGE_SIZE = 100;

type MainContractRow = API.MainContract & {
  company_role: '发包单位' | '承包单位';
};

type SubContractRow = API.SubContract & {
  company_role: '承包单位' | '分包单位';
};

function sortByDateSigned<T extends { date_signed?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = a.date_signed ? new Date(a.date_signed).getTime() : 0;
    const db = b.date_signed ? new Date(b.date_signed).getTime() : 0;
    return db - da;
  });
}

async function fetchCompanyMainContracts(
  companyId: number,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<MainContractRow[]> {
  const [asPartyA, asPartyB] = await Promise.all([
    queryClient.fetchQuery(
      fetchMainContractsQuery({
        party_a_id: companyId,
        pageSize: LIST_PAGE_SIZE,
      }),
    ),
    queryClient.fetchQuery(
      fetchMainContractsQuery({
        party_b_id: companyId,
        pageSize: LIST_PAGE_SIZE,
      }),
    ),
  ]);

  const map = new Map<number, MainContractRow>();
  (asPartyA.data ?? []).forEach((item) => {
    if (item.id) {
      map.set(item.id, { ...item, company_role: '发包单位' });
    }
  });
  (asPartyB.data ?? []).forEach((item) => {
    if (!item.id) return;
    if (!map.has(item.id)) {
      map.set(item.id, { ...item, company_role: '承包单位' });
    }
  });

  return sortByDateSigned(Array.from(map.values()));
}

async function fetchCompanySubContracts(
  companyId: number,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<SubContractRow[]> {
  const [asPartyB, asPartyC] = await Promise.all([
    queryClient.fetchQuery(
      fetchSubContractsQuery({
        party_b_id: companyId,
        pageSize: LIST_PAGE_SIZE,
      }),
    ),
    queryClient.fetchQuery(
      fetchSubContractsQuery({
        party_c_id: companyId,
        pageSize: LIST_PAGE_SIZE,
      }),
    ),
  ]);

  const map = new Map<number, SubContractRow>();
  (asPartyB.data ?? []).forEach((item) => {
    if (item.id) {
      map.set(item.id, { ...item, company_role: '承包单位' });
    }
  });
  (asPartyC.data ?? []).forEach((item) => {
    if (!item.id) return;
    if (!map.has(item.id)) {
      map.set(item.id, { ...item, company_role: '分包单位' });
    }
  });

  return sortByDateSigned(Array.from(map.values()));
}

interface CompanyContractSectionProps {
  companyId: number;
  /** 当前详情 Tab 是否选中（用于懒加载） */
  tabActive: boolean;
}

const CompanyContractSection: React.FC<CompanyContractSectionProps> = ({ companyId, tabActive }) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const [mainContracts, setMainContracts] = useState<MainContractRow[]>([]);
  const [subContracts, setSubContracts] = useState<SubContractRow[]>([]);
  const [mainContractDetail, setMainContractDetail] = useState<API.MainContract>();
  const [mainContractDetailVisible, setMainContractDetailVisible] = useState(false);
  const [subContractDetail, setSubContractDetail] = useState<API.SubContract>();
  const [subContractDetailVisible, setSubContractDetailVisible] = useState(false);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      const [mainRows, subRows] = await Promise.all([
        fetchCompanyMainContracts(companyId, queryClient),
        fetchCompanySubContracts(companyId, queryClient),
      ]);
      setMainContracts(mainRows);
      setSubContracts(subRows);
      setLoaded(true);
    } catch (error) {
      const errorMessage = getErrorMessage(error, '关联合同加载失败，请稍后重试');
      setLoadError(errorMessage);
      setLoaded(false);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [companyId, message, queryClient]);

  useEffect(() => {
    if (!tabActive || loaded) return;
    loadContracts();
  }, [tabActive, loaded, loadContracts]);

  useEffect(() => {
    setLoaded(false);
    setLoadError(undefined);
    setMainContracts([]);
    setSubContracts([]);
    setMainContractDetailVisible(false);
    setSubContractDetailVisible(false);
  }, [companyId]);

  const handleViewMainContract = useCallback((record: MainContractRow) => {
    if (!record.id) return;
    setMainContractDetail(record);
    setMainContractDetailVisible(true);
  }, []);

  const handleViewSubContract = useCallback((record: SubContractRow) => {
    if (!record.id) return;
    setSubContractDetail(record);
    setSubContractDetailVisible(true);
  }, []);

  const mainColumns: ColumnsType<MainContractRow> = useMemo(
    () => [
      {
        title: '角色',
        dataIndex: 'company_role',
        width: 80,
        align: 'center',
      },
      {
        title: '状态',
        dataIndex: 'contract_status',
        width: 72,
        align: 'center',
        render: (_, record) => (
          <Tag color={getContractStatusColor(record.contract_status!)}>
            {record.contract_status}
          </Tag>
        ),
      },
      {
        title: '合同名称',
        dataIndex: 'contract_name',
        ellipsis: true,
        render: (text, record) =>
          text ? (
            <a
              onClick={() => handleViewMainContract(record)}
              style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {text}
            </a>
          ) : (
            '-'
          ),
      },
      {
        title: '签约日期',
        dataIndex: 'date_signed',
        width: 100,
        align: 'center',
        render: (text) => text || '-',
      },
      {
        title: '对方单位',
        key: 'counterparty',
        ellipsis: true,
        width: 140,
        render: (_, record) =>
          record.company_role === '发包单位'
            ? record.partyB?.company_name || '-'
            : record.partyA?.company_name || '-',
      },
      {
        title: '结算金额(元)',
        dataIndex: 'amount_settlement',
        width: 100,
        align: 'right',
        render: (text, record) => formatAmountOrDash(text ?? record.amount_contract),
      },
      {
        title: '收款(元)',
        dataIndex: 'total_received',
        width: 100,
        align: 'right',
        render: (text, record) => renderAmountWithPercentage(text, record),
      },
      {
        title: '开票(元)',
        dataIndex: 'total_invoiced',
        width: 100,
        align: 'right',
        render: (text, record) => renderAmountWithPercentage(text, record),
      },
    ],
    [handleViewMainContract],
  );

  const subColumns: ColumnsType<SubContractRow> = useMemo(
    () => [
      {
        title: '角色',
        dataIndex: 'company_role',
        width: 80,
        align: 'center',
      },
      {
        title: '状态',
        dataIndex: 'contract_status',
        width: 72,
        align: 'center',
        render: (_, record) => (
          <Tag color={getContractStatusColor(record.contract_status!)}>
            {record.contract_status}
          </Tag>
        ),
      },
      {
        title: '类型',
        dataIndex: 'contract_type',
        width: 88,
        align: 'center',
        render: (_, record) => (
          <Tag color={getContractTypeColor(record.contract_type!)}>{record.contract_type}</Tag>
        ),
      },
      {
        title: '合同名称',
        dataIndex: 'contract_name',
        ellipsis: true,
        render: (text, record) =>
          text ? (
            <a
              onClick={() => handleViewSubContract(record)}
              style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {text}
            </a>
          ) : (
            '-'
          ),
      },
      {
        title: '所属总包',
        dataIndex: ['mainContract', 'contract_name'],
        ellipsis: true,
        width: 140,
        render: (text) => text || '-',
      },
      {
        title: '结算金额(元)',
        dataIndex: 'amount_settlement',
        width: 100,
        align: 'right',
        render: (text, record) => formatAmountOrDash(text ?? record.amount_contract),
      },
      {
        title: '付款(元)',
        dataIndex: 'total_paid',
        width: 100,
        align: 'right',
        render: (text, record) => renderAmountWithPercentage(text, record),
      },
      {
        title: '担保',
        dataIndex: 'bonds',
        width: 72,
        align: 'center',
        render: (_, record) => {
          const bondTypesOnRecord = new Set((record.bonds || []).map((b) => b.bond_type));
          const pendingItems: Array<'履约保证金' | '民工保证金'> = [];
          if (record.bond_perf_req && !bondTypesOnRecord.has('履约保证金')) {
            pendingItems.push('履约保证金');
          }
          if (record.bond_labor_req && !bondTypesOnRecord.has('民工保证金')) {
            pendingItems.push('民工保证金');
          }

          if ((!record.bonds || record.bonds.length === 0) && pendingItems.length === 0) {
            return '-';
          }

          return (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
              {(record.bonds || []).map((bond) => {
                const displayStatus = bond.display_status || bond.status || '担保中';
                const color = getBondDisplayStatusHex(bond.bond_form, displayStatus);
                const Icon = BOND_TYPE_ICONS[bond.bond_type];
                return (
                  <Tooltip
                    key={bond.id}
                    title={`${bond.bond_type} - ${displayStatus}${bond.date_end ? ` (到期:${bond.date_end})` : ''}`}
                  >
                    <Icon style={{ fontSize: 16, color }} />
                  </Tooltip>
                );
              })}
              {pendingItems.map((type) => (
                <Tooltip key={type} title={`${type}待登记`}>
                  <PlusCircleOutlined style={{ fontSize: 16, color: UI_COLORS.actionWarning }} />
                </Tooltip>
              ))}
            </div>
          );
        },
      },
    ],
    [handleViewSubContract],
  );

  const hasMainContracts = mainContracts.length > 0;
  const hasSubContracts = subContracts.length > 0;
  const showEmpty = loaded && !hasMainContracts && !hasSubContracts;

  return (
    <Spin spinning={loading}>
      {loadError ? (
        <Alert
          type="error"
          showIcon
          message="关联合同加载失败"
          description={loadError}
          action={
            <Button size="small" onClick={loadContracts}>
              重试
            </Button>
          }
        />
      ) : showEmpty ? (
        <Empty description="暂无关联合同" />
      ) : (
        <>
          {hasMainContracts && (
            <div style={{ marginBottom: hasSubContracts ? 16 : 0 }}>
              <Title level={5} style={{ marginBottom: 8, color: COLORS.textSecondary }}>
                总包合同 ({mainContracts.length})
              </Title>
              <Table<MainContractRow>
                dataSource={mainContracts}
                columns={mainColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 900 }}
              />
            </div>
          )}

          {hasSubContracts && (
            <div>
              <Title level={5} style={{ marginBottom: 8, color: COLORS.textSecondary }}>
                分包合同 ({subContracts.length})
              </Title>
              <Table<SubContractRow>
                dataSource={subContracts}
                columns={subColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 900 }}
              />
            </div>
          )}
        </>
      )}

      <MainContractDetail
        visible={mainContractDetailVisible}
        currentRecord={mainContractDetail}
        onCancel={() => setMainContractDetailVisible(false)}
      />

      <SubContractDetail
        visible={subContractDetailVisible}
        currentRecord={subContractDetail}
        onCancel={() => setSubContractDetailVisible(false)}
      />
    </Spin>
  );
};

export default CompanyContractSection;
