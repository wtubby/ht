import { TableCardSummaryBar } from '@/components/RecordDetail/shared';
import { getTableCardAmountCellStyle } from '@/constants/colors';
import { formatCurrencyOrDash } from '@/utils/format';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Card } from 'antd';
import React from 'react';

interface PaymentTableCardProps {
  payments: API.Payment[];
  selectedKeys: React.Key[];
  loading: boolean;
  onSelectionChange: (keys: React.Key[]) => void;
}

const columns: ProColumns<API.Payment>[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 60,
    align: 'center',
  },
  {
    title: '付款日期',
    dataIndex: 'payment_date',
    valueType: 'date',
    width: 100,
    align: 'center',
  },
  {
    title: '付款金额(元)',
    dataIndex: 'payment_amount',
    align: 'right',
    width: 110,
    render: (text) => (
      <span style={getTableCardAmountCellStyle('payment')}>{formatCurrencyOrDash(text)}</span>
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

const PaymentTableCard: React.FC<PaymentTableCardProps> = ({
  payments,
  selectedKeys,
  loading,
  onSelectionChange,
}) => {
  const selectedTotal = payments
    .filter((payment) => selectedKeys.includes(payment.id!))
    .reduce((sum, payment) => sum + Number(payment.payment_amount || 0), 0);

  return (
    <Card variant="borderless" style={{ borderRadius: '8px' }}>
      <TableCardSummaryBar
        module="payment"
        selectedCount={selectedKeys.length}
        items={[{ label: '汇总金额', value: selectedTotal }]}
      />
      <ProTable<API.Payment>
        columns={columns}
        dataSource={payments}
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

export default PaymentTableCard;
