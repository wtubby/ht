import AttachmentIndicator from '@/components/AttachmentIndicator';
import ListToolbar from '@/components/ListToolbar';
import { COLORS, MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import { getReceiveStatusColor, receiveStatusColors } from '@/constants/statusColors';
import { useRemoveReceive } from '@/hooks';
import { getReceiveList } from '@/services/wtu/receive.api';
import { getErrorMessage } from '@/utils/apiError';
import { formatAmountOrDash } from '@/utils/format';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Tag, Tooltip } from 'antd';
import React, { useCallback, useMemo, useRef } from 'react';

type ReceiveWithFiles = API.Receive & {
  has_files?: boolean;
};

const PAGINATION_CONFIG = {
  pageSize: 10,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
};

interface ReceiveListProps {
  actionRef: React.MutableRefObject<ActionType | undefined>;
  onViewDetail: (record: API.Receive) => void;
  onEdit: (record: API.Receive) => void;
  onCreate: () => void;
}

const ReceiveList: React.FC<ReceiveListProps> = ({ actionRef, onViewDetail, onEdit, onCreate }) => {
  const { message, modal } = App.useApp();
  const removeMutation = useRemoveReceive();
  const searchTextRef = useRef<string>('');

  const handleSearch = useCallback((value: string) => {
    searchTextRef.current = value;
    actionRef.current?.reload();
  }, []);

  const handleRemove = useCallback(
    async (selectedRow: API.Receive) => {
      if (!selectedRow) return;
      if (!selectedRow.id) {
        message.error('记录 ID 缺失，无法删除');
        return;
      }
      try {
        await removeMutation.mutateAsync({ id: selectedRow.id });
        message.success('删除成功');
        actionRef.current?.reload();
      } catch (error) {
        message.error(getErrorMessage(error, '删除失败，请重试'));
      }
    },
    [removeMutation, message, actionRef],
  );

  const columns = useMemo<ProColumns<API.Receive>[]>(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        search: false,
        width: 35,
        align: 'center',
      },
      {
        title: '收款日期',
        dataIndex: 'receive_date',
        valueType: 'date',
        search: false,
        width: 80,
        align: 'center',
      },
      {
        title: '收款状态',
        dataIndex: 'receive_status',
        valueEnum: receiveStatusColors,
        width: 70,
        align: 'center',
        render: (_, record) => (
          <Tag color={getReceiveStatusColor(record.receive_status ?? '')}>
            {record.receive_status ?? '-'}
          </Tag>
        ),
      },

      {
        title: '总包合同',
        dataIndex: ['mainContract', 'contract_name'],
        search: false,
        width: 300,
        ellipsis: true,
        render: (_, record: ReceiveWithFiles) => {
          const partyAName =
            record.payer_name || record.mainContract?.partyA?.company_name;

          return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
              <AttachmentIndicator
                visible={record.has_files}
                title="已上传收款附件"
                color={MODULE_COLORS.receive.color}
                style={{ marginTop: 2 }}
              />
              <div style={{ lineHeight: 1.2, flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <a onClick={() => onViewDetail(record)}>
                  {record.mainContract?.contract_name || '-'}
                </a>
                {partyAName ? (
                  <div style={{ fontSize: '12px', color: COLORS.textTertiary }}>{partyAName}</div>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        title: '收款金额(元)',
        dataIndex: 'receive_amount',
        search: false,
        align: 'right',
        width: 90,
        render: (text) => formatAmountOrDash(text),
      },
      {
        title: '收款户名',
        dataIndex: 'account_name',
        width: 160,
        ellipsis: true,
        render: (_, record) => record.account_name || '-',
      },
      {
        title: '收款账号',
        dataIndex: 'bank_name',
        search: false,
        align: 'center',
        width: 100,
        ellipsis: true,
        render: (_, record) => {
          const bankName = record.bank_name || '';
          const accountNumber = record.account_number;

          if (!accountNumber) {
            return bankName || '-';
          }

          const accountStr = String(accountNumber);
          const last4 = accountStr.length > 4 ? accountStr.slice(-4) : accountStr;

          return bankName ? `${bankName} ${last4}` : last4;
        },
      },

      {
        title: '备注',
        dataIndex: 'remarks',
        search: false,
        width: 100,
        ellipsis: true,
      },

      {
        title: '操作',
        dataIndex: 'option',
        valueType: 'option',
        align: 'center',
        width: 80,
        render: (_, record) => (
          <div
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}
          >
            <Tooltip key="edit" title="编辑">
              <EditOutlined
                style={{
                  color: UI_COLORS.action,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
                onClick={() => {
                  onEdit(record);
                }}
              />
            </Tooltip>
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
                    content: '您确定要删除该收款记录吗？',
                    onOk: () => handleRemove(record),
                  });
                }}
              />
            </Tooltip>
          </div>
        ),
      },
    ],
    [onViewDetail, onEdit, modal, handleRemove],
  );

  const toolBarRender = useCallback(
    () => [
      <ListToolbar
        key="toolbar"
        placeholder="搜索总包合同名称"
        createText="新建收款"
        onSearch={handleSearch}
        onCreate={onCreate}
      />,
    ],
    [handleSearch, onCreate],
  );

  const requestHandler = useCallback(async (params: API.PageParams) => {
    const msg = await getReceiveList({
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
      <ProTable<API.Receive, API.PageParams>
        headerTitle="总包合同收款管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={toolBarRender}
        request={requestHandler}
        columns={columns}
        scroll={{ x: 1500 }}
        pagination={PAGINATION_CONFIG}
        locale={{ emptyText: '还没有收款记录，请先有总包合同后再登记收款' }}
      />
    </PageContainer>
  );
};

export default ReceiveList;
