import { getBondDisplayStatusColor, getBondTypeColor } from '@/constants/statusColors';
import type { BondType } from '@/pages/Bond/bond.shared';
import { calcBondRatioPercent, formatBondStatusLabel } from '@/pages/Bond/bond.shared';
import { formatAmount, formatAmountOrDash } from '@/utils/format';
import { PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Alert, Button, Card, Descriptions, Space, Tag } from 'antd';
import React, { useMemo } from 'react';

type BondRow = NonNullable<API.SubContract['bonds']>[number];

const formatBondRequirement = (
  required?: boolean,
  amount?: number,
  form?: string | null,
  contractAmount?: number | null,
): string => {
  if (!required) return '不需要';
  const parts: string[] = ['需要'];
  if (amount != null && amount > 0) {
    const ratio = calcBondRatioPercent(amount, contractAmount);
    const amountText =
      ratio != null ? `${formatAmount(amount)} 元（${ratio}%）` : `${formatAmount(amount)} 元`;
    parts.push(amountText);
  }
  if (form) {
    parts.push(form);
  }
  return parts.join('，');
};

interface SubContractBondDetailSectionProps {
  contract: API.SubContract;
  onViewBond: (bond: BondRow) => void;
  onRegisterBond: (bondType: BondType) => void;
}

const SubContractBondDetailSection: React.FC<SubContractBondDetailSectionProps> = ({
  contract,
  onViewBond,
  onRegisterBond,
}) => {
  const bonds = contract.bonds ?? [];

  const pendingTypes = useMemo(() => {
    const registered = new Set(bonds.map((b) => b.bond_type));
    const items: BondType[] = [];
    if (contract.bond_perf_req && !registered.has('履约保证金')) {
      items.push('履约保证金');
    }
    if (contract.bond_labor_req && !registered.has('民工保证金')) {
      items.push('民工保证金');
    }
    return items;
  }, [contract, bonds]);

  const bondColumns = useMemo<ProColumns<BondRow>[]>(
    () => [
      {
        title: '类型',
        dataIndex: 'bond_type',
        width: 110,
        align: 'center',
        render: (_, record) => (
          <Tag color={getBondTypeColor(record.bond_type)}>{record.bond_type}</Tag>
        ),
      },
      {
        title: '形式',
        dataIndex: 'bond_form',
        width: 70,
        align: 'center',
      },
      {
        title: '状态',
        dataIndex: 'display_status',
        width: 120,
        align: 'center',
        render: (_, record) => {
          const displayStatus = record.display_status || record.status;
          return (
            <Tag color={getBondDisplayStatusColor(record.bond_form ?? '', displayStatus ?? '')}>
              {formatBondStatusLabel(record.bond_form ?? '', displayStatus ?? '')}
            </Tag>
          );
        },
      },
      {
        title: '金额（元）',
        dataIndex: 'amount',
        align: 'right',
        width: 120,
        render: (text) => formatAmountOrDash(text),
      },
      {
        title: '有效期',
        width: 250,
        render: (_, record) => {
          const start = record.date_start || '';
          const end = record.date_end || '';
          if (!start && !end) return '-';
          if (!start) return end;
          if (!end) return start;
          return `${start} ～ ${end}`;
        },
      },
      {
        title: '开立机构',
        dataIndex: 'organization',
        ellipsis: true,
        render: (text) => text || '-',
      },
      {
        title: '操作',
        valueType: 'option',
        width: 90,
        render: (_, record) => [
          <Button key="view" type="link" size="small" onClick={() => onViewBond(record)}>
            查看详情
          </Button>,
        ],
      },
    ],
    [onViewBond],
  );

  const hasBondAgreement = contract.bond_perf_req || contract.bond_labor_req;

  return (
    <Card variant="borderless" style={{ borderRadius: '8px' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {hasBondAgreement && (
          <Descriptions
            column={1}
            bordered
            size="small"
            title="合同约定"
            styles={{
              label: { width: 120, textAlign: 'center' },
            }}
          >
            <Descriptions.Item label="履约保证金">
              {formatBondRequirement(
                contract.bond_perf_req,
                contract.bond_perf_amt,
                contract.bond_perf_form,
                contract.amount_contract,
              )}
            </Descriptions.Item>
            <Descriptions.Item label="民工保证金">
              {formatBondRequirement(
                contract.bond_labor_req,
                contract.bond_labor_amt,
                contract.bond_labor_form,
                contract.amount_contract,
              )}
            </Descriptions.Item>
          </Descriptions>
        )}

        {pendingTypes.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="以下保证金类型尚未建立台账"
            description={
              <Space wrap>
                {pendingTypes.map((type) => (
                  <Button
                    key={type}
                    size="small"
                    type="primary"
                    ghost
                    icon={<PlusOutlined />}
                    onClick={() => onRegisterBond(type)}
                  >
                    登记{type}
                  </Button>
                ))}
              </Space>
            }
          />
        )}

        <ProTable<BondRow>
          rowKey="id"
          search={false}
          options={false}
          pagination={false}
          dataSource={bonds}
          columns={bondColumns}
          locale={{
            emptyText: hasBondAgreement ? '暂无担保台账，请点击上方按钮登记' : '本合同未约定保证金',
          }}
          scroll={{ x: 800 }}
          tableAlertRender={false}
        />
      </Space>
    </Card>
  );
};

export default SubContractBondDetailSection;
