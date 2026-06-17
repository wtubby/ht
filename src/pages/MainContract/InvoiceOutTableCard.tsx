import { TableCardSummaryBar } from '@/components/RecordDetail/shared';
import { COLORS, getTableCardAmountCellStyle } from '@/constants/colors';
import { formatCurrencyOrDash } from '@/utils/format';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Card } from 'antd';
import React from 'react';

interface InvoiceOutTableCardProps {
  invoices: API.InvoiceOut[];
  selectedKeys: React.Key[];
  loading: boolean;
  onSelectionChange: (keys: React.Key[]) => void;
}

const columns: ProColumns<API.InvoiceOut>[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 60,
    align: 'center',
  },
  {
    title: '发票号码',
    dataIndex: 'invoice_no',
    width: 180,
    render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
  },
  {
    title: '开票日期',
    dataIndex: 'invoice_date',
    valueType: 'date',
    width: 110,
    align: 'center',
  },
  {
    title: '发票金额(元)',
    dataIndex: 'invoice_amount',
    align: 'right',
    width: 130,
    render: (text) => (
      <span style={getTableCardAmountCellStyle('invoiceOut')}>{formatCurrencyOrDash(text)}</span>
    ),
  },
  {
    title: '税率',
    dataIndex: 'tax_rate',
    width: 80,
    align: 'center',
    render: (text) => {
      if (text === null || text === undefined || text === '') return '-';
      return (
        <span style={{ color: COLORS.textSecondary, fontSize: '13px' }}>
          {Number(text).toFixed(2)}%
        </span>
      );
    },
  },
  {
    title: '购买方',
    dataIndex: 'buyer',
    width: 250,
    ellipsis: true,
  },
  {
    title: '销售方',
    dataIndex: 'seller',
    width: 200,
    ellipsis: true,
  },
  {
    title: '备注',
    dataIndex: 'remarks',
    ellipsis: true,
  },
];

const InvoiceOutTableCard: React.FC<InvoiceOutTableCardProps> = ({
  invoices,
  selectedKeys,
  loading,
  onSelectionChange,
}) => {
  const selectedTotal = invoices
    .filter((inv) => selectedKeys.includes(inv.id!))
    .reduce((sum, inv) => sum + Number(inv.invoice_amount || 0), 0);

  return (
    <Card variant="borderless" style={{ borderRadius: '8px' }}>
      <TableCardSummaryBar
        module="invoiceOut"
        selectedCount={selectedKeys.length}
        items={[{ label: '汇总金额', value: selectedTotal }]}
      />
      <ProTable<API.InvoiceOut>
        columns={columns}
        dataSource={invoices}
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

export default InvoiceOutTableCard;
