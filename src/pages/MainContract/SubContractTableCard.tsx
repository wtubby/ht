import { TableCardSummaryBar } from '@/components/RecordDetail/shared';
import {
  COLORS,
  getTableCardAmountCellStyle,
  type ModuleColorKey,
} from '@/constants/colors';
import { getContractStatusColor, getContractTypeColor } from '@/constants/statusColors';
import { calcProgressPct, formatAmountOrDash } from '@/utils/format';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Card, Tag } from 'antd';
import React, { useMemo } from 'react';

interface SubContractTableCardProps {
  subContracts: API.SubContract[];
  subContractStats: Map<number, { paymentTotal: number; invoiceTotal: number }>;
  selectedKeys: React.Key[];
  loading: boolean;
  onSelectionChange: (keys: React.Key[]) => void;
}

const renderSubAmountCell = (amount: number, record: API.SubContract, module: ModuleColorKey) => {
  const formattedAmount = formatAmountOrDash(amount, { zeroAsDash: true });
  if (formattedAmount === '-') {
    return '-';
  }

  const baseAmount = Number(record.amount_settlement) || Number(record.amount_contract) || 0;
  const percentage = calcProgressPct(amount, baseAmount);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span style={getTableCardAmountCellStyle(module)}>{formattedAmount}</span>
      <div
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '-4px',
          fontSize: '12px',
          color: COLORS.textTertiary,
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}
      >
        {percentage.toFixed(2)}%
      </div>
    </div>
  );
};

const baseColumns: ProColumns<API.SubContract>[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 40,
    align: 'center',
  },
  {
    title: '状态',
    dataIndex: 'contract_status',
    width: 60,
    align: 'center',
    render: (_, record) => (
      <Tag color={getContractStatusColor(record.contract_status!)}>{record.contract_status}</Tag>
    ),
  },
  {
    title: '类型',
    dataIndex: 'contract_type',
    width: 70,
    align: 'center',
    render: (_, record) => (
      <Tag color={getContractTypeColor(record.contract_type!)}>{record.contract_type}</Tag>
    ),
  },
  {
    title: '分包合同名称',
    dataIndex: 'contract_name',
    width: 240,
    ellipsis: true,
  },
  {
    title: '分包单位',
    dataIndex: ['partyC', 'company_name'],
    width: 180,
    ellipsis: true,
  },
  {
    title: '合同金额(元)',
    dataIndex: 'amount_contract',
    align: 'right',
    width: 95,
    render: (text) => (
      <span style={getTableCardAmountCellStyle('subContract')}>{formatAmountOrDash(text)}</span>
    ),
  },
  {
    title: '结算金额(元)',
    dataIndex: 'amount_settlement',
    align: 'right',
    width: 95,
    render: (text) => (
      <span style={getTableCardAmountCellStyle('subContract')}>{formatAmountOrDash(text)}</span>
    ),
  },
];

const SubContractTableCard: React.FC<SubContractTableCardProps> = ({
  subContracts,
  subContractStats,
  selectedKeys,
  loading,
  onSelectionChange,
}) => {
  const selectedRows = useMemo(
    () => subContracts.filter((row) => selectedKeys.includes(row.id!)),
    [subContracts, selectedKeys],
  );

  const selectedTotals = useMemo(() => {
    return selectedRows.reduce(
      (acc, row) => {
        const stats = subContractStats.get(row.id!);
        acc.contract += Number(row.amount_contract || 0);
        acc.settlement += Number(row.amount_settlement || 0);
        acc.payment += stats?.paymentTotal || 0;
        acc.invoice += stats?.invoiceTotal || 0;
        return acc;
      },
      { contract: 0, settlement: 0, payment: 0, invoice: 0 },
    );
  }, [selectedRows, subContractStats]);

  const tableColumns: ProColumns<API.SubContract>[] = [
    ...baseColumns,
    {
      title: '付款金额(元)',
      dataIndex: 'payment_total',
      align: 'right',
      width: 110,
      render: (_, record) => {
        const stats = subContractStats.get(record.id!);
        const amount = stats?.paymentTotal || 0;
        return renderSubAmountCell(amount, record, 'payment');
      },
    },
    {
      title: '开票金额(元)',
      dataIndex: 'invoice_total',
      align: 'right',
      width: 110,
      render: (_, record) => {
        const stats = subContractStats.get(record.id!);
        const amount = stats?.invoiceTotal || 0;
        return renderSubAmountCell(amount, record, 'invoiceIn');
      },
    },
  ];

  return (
    <Card variant="borderless" style={{ borderRadius: '8px' }}>
      <TableCardSummaryBar
        module="subContract"
        selectedCount={selectedKeys.length}
        items={[
          { label: '合同金额', value: selectedTotals.contract },
          { label: '结算金额', value: selectedTotals.settlement },
          { label: '付款', value: selectedTotals.payment, module: 'payment' },
          { label: '开票', value: selectedTotals.invoice, module: 'invoiceIn' },
        ]}
      />
      <ProTable<API.SubContract>
        columns={tableColumns}
        dataSource={subContracts}
        rowKey="id"
        search={false}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
        }}
        loading={loading}
        options={false}
        scroll={{ x: 1000 }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => onSelectionChange(keys),
        }}
        tableAlertRender={false}
      />
    </Card>
  );
};

export default SubContractTableCard;
