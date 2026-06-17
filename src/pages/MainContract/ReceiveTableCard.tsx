import { TableCardSummaryBar } from '@/components/RecordDetail/shared';
import { getTableCardAmountCellStyle } from '@/constants/colors';
import { getReceiveStatusColor } from '@/constants/statusColors';
import { formatCurrencyOrDash } from '@/utils/format';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Card, Tag } from 'antd';
import React from 'react';

interface ReceiveTableCardProps {
  receives: API.Receive[];
  selectedKeys: React.Key[];
  loading: boolean;
  onSelectionChange: (keys: React.Key[]) => void;
}

const columns: ProColumns<API.Receive>[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 60,
    align: 'center',
  },
  {
    title: '收款日期',
    dataIndex: 'receive_date',
    valueType: 'date',
    width: 110,
    align: 'center',
  },
  {
    title: '收款金额(元)',
    dataIndex: 'receive_amount',
    align: 'right',
    width: 130,
    render: (text) => (
      <span style={getTableCardAmountCellStyle('receive')}>{formatCurrencyOrDash(text)}</span>
    ),
  },
  {
    title: '收款状态',
    dataIndex: 'receive_status',
    width: 100,
    align: 'center',
    render: (_, record) => (
      <Tag color={getReceiveStatusColor(record.receive_status!)}>{record.receive_status}</Tag>
    ),
  },
  {
    title: '付款方',
    dataIndex: 'payer_name',
    width: 250,
    ellipsis: true,
  },
  {
    title: '收款方',
    dataIndex: 'account_name',
    width: 250,
    ellipsis: true,
  },
  {
    title: '备注',
    dataIndex: 'remarks',
    ellipsis: true,
  },
];

const ReceiveTableCard: React.FC<ReceiveTableCardProps> = ({
  receives,
  selectedKeys,
  loading,
  onSelectionChange,
}) => {
  const selectedTotal = receives
    .filter((r) => selectedKeys.includes(r.id!))
    .reduce((sum, r) => sum + Number(r.receive_amount || 0), 0);

  return (
    <Card variant="borderless" style={{ borderRadius: '8px' }}>
      <TableCardSummaryBar
        module="receive"
        selectedCount={selectedKeys.length}
        items={[{ label: '汇总金额', value: selectedTotal }]}
      />
      <ProTable<API.Receive>
        columns={columns}
        dataSource={receives}
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

export default ReceiveTableCard;
