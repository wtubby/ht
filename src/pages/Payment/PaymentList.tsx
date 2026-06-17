import AttachmentIndicator from '@/components/AttachmentIndicator';
import ListToolbar from '@/components/ListToolbar';
import { COLORS, MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import { useRemovePayment } from '@/hooks';
import { getPayments } from '@/services/wtu/payment.api';
import { getErrorMessage } from '@/utils/apiError';
import { formatAmountOrDash } from '@/utils/format';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Tooltip } from 'antd';
import React, { useCallback, useMemo, useRef } from 'react';

type PaymentWithFiles = API.Payment & {
  has_files?: boolean;
};

const PAGINATION_CONFIG = {
  pageSize: 10,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
};

interface PaymentListProps {
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  onViewDetail: (record: PaymentWithFiles) => void;
  onEdit: (record: PaymentWithFiles) => void;
  onCreate: () => void;
}

const PaymentList: React.FC<PaymentListProps> = ({
  actionRef: externalActionRef,
  onViewDetail,
  onEdit,
  onCreate,
}) => {
  const internalActionRef = useRef<ActionType>();
  const actionRef = externalActionRef || internalActionRef;
  const { message, modal } = App.useApp();
  const searchTextRef = useRef<string>('');

  const removeMutation = useRemovePayment();

  const handleRemove = useCallback(
    async (selectedRow: PaymentWithFiles) => {
      if (!selectedRow?.id) return false;

      try {
        await removeMutation.mutateAsync({ id: selectedRow.id });
        message.success('删除成功');
        actionRef.current?.reloadAndRest?.();
        return true;
      } catch (error) {
        message.error(getErrorMessage(error, '删除失败，请重试'));
        return false;
      }
    },
    [removeMutation, message, actionRef],
  );

  const handleSearch = useCallback(
    (value: string) => {
      searchTextRef.current = value;
      actionRef.current?.reloadAndRest?.();
    },
    [actionRef],
  );

  const columns = useMemo<ProColumns<PaymentWithFiles>[]>(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        search: false,
        width: 40,
        align: 'center',
      },
      {
        title: '付款日期',
        dataIndex: 'payment_date',
        valueType: 'date',
        width: 70,
        align: 'center',
      },
      {
        title: '分包合同',
        dataIndex: ['subContract', 'contract_name'],
        search: false,
        width: 250,
        ellipsis: true,
        render: (_, record) => {
          const partyCName = record.subContract?.partyC?.company_name;

          return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <AttachmentIndicator
                visible={record.has_files}
                title="已上传付款附件"
                color={MODULE_COLORS.payment.color}
                style={{ marginTop: 2 }}
              />
              <div style={{ lineHeight: 1.2, flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <a onClick={() => onViewDetail(record)}>{record.subContract?.contract_name || '-'}</a>
                {partyCName ? (
                  <div style={{ fontSize: '12px', color: COLORS.textTertiary }}>{partyCName}</div>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        title: '付款金额(元)',
        dataIndex: 'payment_amount',
        search: false,
        align: 'right',
        width: 80,
        render: (text) => formatAmountOrDash(text),
      },
      {
        title: '账户户名',
        dataIndex: 'account_name',
        width: 180,
        ellipsis: true,
        render: (_, record) => record.account_name || '-',
      },
      {
        title: '收款账号',
        dataIndex: 'bank_name',
        search: false,
        ellipsis: true,
        width: 200,
        render: (_, record) => {
          const bankName = record.bank_name || '';
          const accountNumber = record.account_number;

          if (!bankName && !accountNumber) return '-';

          const accountStr = accountNumber ? String(accountNumber) : '';

          return (
            <div style={{ lineHeight: 1.2 }}>
              {bankName ? <div>{bankName}</div> : null}
              {accountStr ? (
                <div style={{ fontSize: '12px', color: COLORS.textTertiary }}>{accountStr}</div>
              ) : null}
            </div>
          );
        },
      },
      {
        title: '备注',
        dataIndex: 'remarks',
        width: 80,
        ellipsis: true,
      },
      {
        title: '操作',
        dataIndex: 'option',
        valueType: 'option',
        width: 60,
        align: 'center',
        render: (_, record) => (
          <div
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
          >
            <Tooltip key="edit" title="编辑">
              <EditOutlined
                style={{ fontSize: '16px', color: UI_COLORS.action, cursor: 'pointer' }}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
            <Tooltip key="delete" title="删除">
              <DeleteOutlined
                style={{ fontSize: '16px', color: UI_COLORS.actionDanger, cursor: 'pointer' }}
                onClick={() => {
                  modal.confirm({
                    title: '确认删除',
                    content: '您确定要删除该付款记录吗？',
                    onOk: () => handleRemove(record),
                  });
                }}
              />
            </Tooltip>
          </div>
        ),
      },
    ],
    [onEdit, onViewDetail, handleRemove, modal],
  );

  const toolBarRender = useCallback(
    () => [
      <ListToolbar
        key="toolbar"
        placeholder="搜索分包合同名称"
        createText="新建付款"
        onSearch={handleSearch}
        onCreate={onCreate}
      />,
    ],
    [handleSearch, onCreate],
  );

  const requestHandler = useCallback(async (params: API.PageParams) => {
    const msg = await getPayments({
      page: params.current,
      pageSize: params.pageSize,
      contract_name: searchTextRef.current || undefined,
    });
    return {
      data: msg.data,
      success: msg.success,
      total: msg.total,
    };
  }, []);

  return (
    <PageContainer pageHeaderRender={false}>
      <ProTable<PaymentWithFiles, API.PageParams>
        headerTitle="分包合同付款管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={toolBarRender}
        request={requestHandler}
        columns={columns}
        scroll={{ x: 1050 }}
        pagination={PAGINATION_CONFIG}
        locale={{ emptyText: '还没有付款记录，请先有分包合同后再登记付款' }}
      />
    </PageContainer>
  );
};

export default PaymentList;
