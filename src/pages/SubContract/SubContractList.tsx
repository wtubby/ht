import AttachmentIndicator from '@/components/AttachmentIndicator';
import ListToolbar from '@/components/ListToolbar';
import { MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import {
  getBondDisplayStatusHex,
  getContractStatusColor,
  getContractTypeColor,
} from '@/constants/statusColors';
import { useRemoveSubContract } from '@/hooks';
import { BOND_TYPE_ICONS } from '@/pages/Bond/bond.shared';
import { getSubContracts } from '@/services/wtu/subContract.api';
import { getErrorMessage } from '@/utils/apiError';
import { formatAmountOrDash, renderAmountWithPercentage } from '@/utils/format';
import { DeleteOutlined, EditOutlined, PlusCircleOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { App, Tag, Tooltip } from 'antd';
import React, { useCallback, useMemo, useRef } from 'react';

interface SubContractListProps {
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  onViewDetail: (record: API.SubContract) => void;
  onEdit: (record: API.SubContract) => void;
  onCreate: () => void;
}

const SubContractList: React.FC<SubContractListProps> = ({
  actionRef: externalActionRef,
  onViewDetail,
  onEdit,
  onCreate,
}) => {
  const { message, modal } = App.useApp();
  const internalActionRef = useRef<ActionType>();
  const actionRef = externalActionRef ?? internalActionRef;
  const searchTextRef = useRef<string>('');

  const removeMutation = useRemoveSubContract();

  const handleRemove = useCallback(
    async (selectedRow: API.SubContract) => {
      try {
        await removeMutation.mutateAsync({ id: selectedRow.id!, entity: selectedRow });
        message.success('删除成功');
        actionRef.current?.reload();
      } catch (error) {
        message.error(getErrorMessage(error, '删除失败，请重试'));
      }
    },
    [removeMutation, message, actionRef],
  );

  const confirmRemove = useCallback(
    (record: API.SubContract) => {
      modal.confirm({
        title: '确认删除',
        content: `您确定要删除合同"${record.contract_name}"吗？仅当无付款、进项发票、担保等关联数据时可删除。`,
        onOk: () => handleRemove(record),
      });
    },
    [modal, handleRemove],
  );

  const handleSearch = useCallback(
    (value: string) => {
      searchTextRef.current = value;
      actionRef.current?.reload();
    },
    [actionRef],
  );

  const columns: ProColumns<API.SubContract>[] = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 40,
        align: 'center',
      },
      {
        title: '状态',
        dataIndex: 'contract_status',
        width: 50,
        align: 'center',
        render: (_, record) => (
          <Tag color={getContractStatusColor(record.contract_status!)}>
            {record.contract_status}
          </Tag>
        ),
      },
      {
        title: '合同类型',
        dataIndex: 'contract_type',
        width: 60,
        align: 'center',
        render: (_, record) => (
          <Tag color={getContractTypeColor(record.contract_type!)}>{record.contract_type}</Tag>
        ),
      },
      {
        title: '签约日期',
        dataIndex: 'date_signed',
        valueType: 'date',
        width: 70,
        align: 'center',
      },
      {
        title: '担保',
        dataIndex: 'bonds',
        width: 50,
        align: 'center',
        render: (_, record) => {
          const bondTypesOnRecord = new Set((record.bonds || []).map((b) => b.bond_type));
          const pendingItems: Array<{ type: '履约保证金' | '民工保证金'; label: string }> = [];
          if (record.bond_perf_req && !bondTypesOnRecord.has('履约保证金')) {
            pendingItems.push({ type: '履约保证金', label: '履约待登记' });
          }
          if (record.bond_labor_req && !bondTypesOnRecord.has('民工保证金')) {
            pendingItems.push({ type: '民工保证金', label: '民工待登记' });
          }

          const goRegister = (bondType: '履约保证金' | '民工保证金') => {
            history.push(
              `/bonds?sub_contract_id=${record.id}&bond_type=${encodeURIComponent(bondType)}`,
            );
          };

          if ((!record.bonds || record.bonds.length === 0) && pendingItems.length === 0) {
            return '-';
          }

          return (
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}
            >
              {(record.bonds || []).map((bond) => {
                const displayStatus = bond.display_status || bond.status || '担保中';
                const color = getBondDisplayStatusHex(bond.bond_form, displayStatus);
                const Icon = BOND_TYPE_ICONS[bond.bond_type];

                return (
                  <Tooltip
                    key={bond.id}
                    title={`${bond.bond_type} - ${displayStatus}${bond.date_end ? ` (到期:${bond.date_end})` : ''}`}
                  >
                    <Icon style={{ fontSize: '16px', color, cursor: 'pointer' }} />
                  </Tooltip>
                );
              })}
              {pendingItems.map((item) => (
                <Tooltip key={item.type} title={`${item.label}，点击前往担保管理登记`}>
                  <PlusCircleOutlined
                    style={{ fontSize: '16px', color: UI_COLORS.actionWarning, cursor: 'pointer' }}
                    onClick={() => goRegister(item.type)}
                  />
                </Tooltip>
              ))}
            </div>
          );
        },
      },
      {
        title: '分包合同名称',
        dataIndex: 'contract_name',
        ellipsis: true,
        width: 260,
        render: (text, record) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AttachmentIndicator
              visible={record.has_files}
              title="已上传合同文件"
              color={MODULE_COLORS.subContract.color}
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
        title: '分包单位',
        dataIndex: ['partyC', 'company_name'],
        width: 160,
        ellipsis: true,
      },
      {
        title: '合同金额(元)',
        dataIndex: 'amount_contract',
        width: 80,
        align: 'right',
        render: (text) => formatAmountOrDash(text),
      },
      {
        title: '结算金额(元)',
        dataIndex: 'amount_settlement',
        width: 80,
        align: 'right',
        render: (text) => formatAmountOrDash(text),
      },
      {
        title: '付款(元)',
        dataIndex: 'total_paid',
        width: 80,
        align: 'right',
        render: (text, record) => renderAmountWithPercentage(text, record),
      },
      {
        title: '发票(元)',
        dataIndex: 'total_invoiced',
        width: 80,
        align: 'right',
        render: (text, record) => renderAmountWithPercentage(text, record),
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
              onClick={() => confirmRemove(record)}
            />
          </Tooltip>,
        ],
      },
    ],
    [onViewDetail, onEdit, confirmRemove],
  );

  return (
    <PageContainer pageHeaderRender={false}>
      <ProTable<API.SubContract, API.PageParams>
        headerTitle="分包合同管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        toolBarRender={() => [
          <ListToolbar
            key="toolbar"
            placeholder="搜索合同名称"
            createText="新建合同"
            onSearch={handleSearch}
            onCreate={onCreate}
          />,
        ]}
        request={async (params) => {
          const res = await getSubContracts({
            page: params.current,
            pageSize: params.pageSize,
            contract_name: searchTextRef.current || undefined,
          });
          return {
            data: res.data,
            success: res.success,
            total: res.total,
          };
        }}
        columns={columns}
        scroll={{ x: 1400 }}
        locale={{ emptyText: '还没有分包合同，请先从总包合同页面创建' }}
      />
    </PageContainer>
  );
};

export default SubContractList;
