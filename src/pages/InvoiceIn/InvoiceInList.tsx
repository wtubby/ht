import AttachmentIndicator from '@/components/AttachmentIndicator';
import ListToolbar from '@/components/ListToolbar';
import { MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import { invoiceTaxRateTagColor } from '@/constants/statusColors';
import { useRemoveInvoiceIn } from '@/hooks';
import { getInvoiceIns } from '@/services/wtu/invoiceIn.api';
import { getErrorMessage } from '@/utils/apiError';
import { formatAmountOrDash } from '@/utils/format';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Tag, Tooltip } from 'antd';
import React, { useCallback, useRef } from 'react';

type InvoiceInWithFiles = API.InvoiceIn & {
  has_files?: boolean;
};

interface InvoiceInListProps {
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  onViewDetail: (record: API.InvoiceIn) => void;
  onEdit: (record: API.InvoiceIn) => void;
  onCreate: () => void;
}

const InvoiceInList: React.FC<InvoiceInListProps> = ({
  actionRef: externalActionRef,
  onViewDetail,
  onEdit,
  onCreate,
}) => {
  const internalActionRef = useRef<ActionType>();
  const actionRef = externalActionRef || internalActionRef;
  const searchTextRef = useRef<string>('');
  const { message, modal } = App.useApp();
  const removeMutation = useRemoveInvoiceIn();

  const handleRemove = async (selectedRow: API.InvoiceIn) => {
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

  const handleSearch = useCallback((value: string) => {
    searchTextRef.current = value;
    actionRef.current?.reload();
  }, []);

  const columns: ProColumns<InvoiceInWithFiles>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      search: false,
      width: 40,
      align: 'center',
    },
    {
      title: '开票日期',
      dataIndex: 'invoice_date',
      valueType: 'date',
      width: 80,
      align: 'center',
      search: false,
    },
    {
      title: '发票号码',
      dataIndex: 'invoice_no',
      width: 150,
      ellipsis: true,
      search: false,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AttachmentIndicator
            visible={record.has_files}
            title="已上传发票附件"
            color={MODULE_COLORS.invoiceIn.color}
          />
          <a
            onClick={() => onViewDetail(record)}
            style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {text}
          </a>
        </div>
      ),
    },
    {
      title: '分包合同',
      dataIndex: ['subContract', 'contract_name'],
      search: false,
      width: 250,
      ellipsis: true,
    },
    {
      title: '购买方',
      dataIndex: 'buyer',
      width: 170,
      ellipsis: true,
      search: false,
    },
    {
      title: '销售方',
      dataIndex: 'seller',
      width: 170,
      ellipsis: true,
      search: false,
    },
    {
      title: '发票金额(元)',
      dataIndex: 'invoice_amount',
      search: false,
      align: 'right',
      width: 130,
      render: (text, record) => {
        const amount = formatAmountOrDash(text);
        const taxRate =
          record.tax_rate !== null && record.tax_rate !== undefined
            ? Number(record.tax_rate)
            : null;
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
            }}
          >
            <span>{amount}</span>
            {taxRate !== null && (
              <Tag color={invoiceTaxRateTagColor} style={{ margin: 0, width: 30 }}>
                {taxRate}%
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      width: 80,
      ellipsis: true,
      search: false,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      align: 'center',
      width: 80,
      render: (_, record) => [
        <Tooltip key="edit" title="编辑">
          <EditOutlined
            style={{
              color: UI_COLORS.action,
              cursor: 'pointer',
              marginRight: 12,
              fontSize: 16,
            }}
            onClick={() => onEdit(record)}
          />
        </Tooltip>,
        <Tooltip key="delete" title="删除">
          <DeleteOutlined
            style={{
              color: UI_COLORS.actionDanger,
              cursor: 'pointer',
              fontSize: 16,
            }}
            onClick={() => {
              modal.confirm({
                title: '确认删除',
                content: '您确定要删除该进项发票吗？',
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
      <ProTable<InvoiceInWithFiles, API.PageParams>
        headerTitle="进项发票管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <ListToolbar
            key="toolbar"
            placeholder="搜索发票号码或合同名称"
            createText="新增进项发票"
            onSearch={handleSearch}
            onCreate={onCreate}
          />,
        ]}
        request={async (params) => {
          const msg = await getInvoiceIns({
            page: params.current,
            pageSize: params.pageSize,
            search: searchTextRef.current || undefined,
          });
          return {
            data: msg.data,
            success: msg.success,
            total: msg.total,
          };
        }}
        columns={columns}
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        locale={{ emptyText: '还没有进项发票，请先有分包合同后再登记进项发票' }}
      />
    </PageContainer>
  );
};

export default InvoiceInList;
