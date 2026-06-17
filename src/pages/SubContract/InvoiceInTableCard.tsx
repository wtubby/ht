import { TableCardSummaryBar } from '@/components/RecordDetail/shared';
import { getTableCardAmountCellStyle } from '@/constants/colors';
import { formatCurrencyOrDash } from '@/utils/format';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Card } from 'antd';
import React from 'react';

interface InvoiceInTableCardProps {
  invoices: API.InvoiceIn[];
  selectedKeys: React.Key[];
  loading: boolean;
  onSelectionChange: (keys: React.Key[]) => void;
}

const columns: ProColumns<API.InvoiceIn>[] = [
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
  },
  {
    title: '开票日期',
    dataIndex: 'invoice_date',
    valueType: 'date',
    width: 100,
    align: 'center',
  },
  {
    title: '发票金额(元)',
    dataIndex: 'invoice_amount',
    align: 'right',
    width: 110,
    render: (text) => (
      <span style={getTableCardAmountCellStyle('invoiceIn')}>{formatCurrencyOrDash(text)}</span>
    ),
  },
  {
    title: '购买方',
    dataIndex: 'buyer',
    width: 230,
    ellipsis: true,
  },
  {
    title: '销售方',
    dataIndex: 'seller',
    width: 240,
    ellipsis: true,
  },
  {
    title: '备注',
    dataIndex: 'remarks',
    ellipsis: true,
  },
];

const InvoiceInTableCard: React.FC<InvoiceInTableCardProps> = ({
  invoices,
  selectedKeys,
  loading,
  onSelectionChange,
}) => {
  const selectedTotal = invoices
    .filter((invoice) => selectedKeys.includes(invoice.id!))
    .reduce((sum, invoice) => sum + Number(invoice.invoice_amount || 0), 0);

  return (
    <Card variant="borderless" style={{ borderRadius: '8px' }}>
      <TableCardSummaryBar
        module="invoiceIn"
        selectedCount={selectedKeys.length}
        items={[{ label: '汇总金额', value: selectedTotal }]}
      />
      <ProTable<API.InvoiceIn>
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

export default InvoiceInTableCard;
