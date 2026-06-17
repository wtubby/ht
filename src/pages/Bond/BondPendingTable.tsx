import { getBondTypeColor } from '@/constants/statusColors';
import { useBondPendingOptions } from '@/hooks/useBond';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Button, Input, Tag, Tooltip } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { calcBondRatioPercent, flattenPendingBondRows, type BondCreatePreset } from './bond.shared';
import { formatAmount, formatAmountOrDash } from '@/utils/format';

interface BondPendingTableProps {
  onRegister: (preset: BondCreatePreset) => void;
}

const BondPendingTable: React.FC<BondPendingTableProps> = ({ onRegister }) => {
  const { data, isLoading } = useBondPendingOptions(true);
  const [searchText, setSearchText] = useState('');

  const allRows = useMemo(() => {
    const list = (data as { data?: { subContracts?: API.SubContract[] } } | undefined)?.data
      ?.subContracts;
    return flattenPendingBondRows(list || []);
  }, [data]);

  const tableData = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return allRows;
    return allRows.filter(
      (row) =>
        row.contract_name.toLowerCase().includes(keyword) ||
        row.party_c_name.toLowerCase().includes(keyword),
    );
  }, [allRows, searchText]);

  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      setSearchText('');
    }
  }, []);

  const columns: ProColumns<ReturnType<typeof flattenPendingBondRows>[number]>[] = [
    {
      title: '分包合同',
      dataIndex: 'contract_name',
      ellipsis: true,
      width: 280,
    },
    {
      title: '分包单位',
      dataIndex: 'party_c_name',
      width: 180,
      ellipsis: true,
    },
    {
      title: '待登记类型',
      dataIndex: 'bond_type',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <Tag color={getBondTypeColor(record.bond_type)}>{record.bond_type}</Tag>
      ),
    },
    {
      title: '约定金额（元）',
      dataIndex: 'planned_amount',
      align: 'right',
      width: 160,
      render: (_, record) => {
        const hasAmount = record.planned_amount != null && record.planned_amount > 0;
        const ratio = calcBondRatioPercent(record.planned_amount, record.amount_contract);

        return (
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}
          >
            <span>{hasAmount ? formatAmount(record.planned_amount) : '-'}</span>
            {ratio != null && (
              <Tooltip title={`合同额的 ${ratio}%`}>
                <Tag
                  color="cyan"
                  style={{
                    margin: 0,
                    width: 30,
                    textAlign: 'center',
                    display: 'inline-block',
                    paddingInline: 4,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {ratio}%
                </Tag>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: '约定形式',
      dataIndex: 'planned_form',
      width: 90,
      align: 'center',
      render: (_, record) => record.planned_form || '-',
    },
    {
      title: '合同金额（元）',
      dataIndex: 'amount_contract',
      align: 'right',
      width: 130,
      render: (_, record) => formatAmountOrDash(record.amount_contract),
    },
    {
      title: '操作',
      width: 110,
      align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() =>
              onRegister({
                sub_contract_id: record.sub_contract_id,
                bond_type: record.bond_type,
              })
            }
          >
            登记担保
          </Button>
        </div>
      ),
    },
  ];

  const emptyText =
    allRows.length === 0
      ? '暂无待登记保证金'
      : searchText.trim()
        ? '无匹配结果，请调整搜索条件'
        : '暂无待登记保证金';

  return (
    <ProTable
      rowKey="key"
      headerTitle="待登记保证金"
      search={false}
      options={false}
      loading={isLoading}
      dataSource={tableData}
      columns={columns}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50],
      }}
      scroll={{ x: 1000 }}
      toolBarRender={() => [
        <Input.Search
          key="search"
          placeholder="搜索分包合同、分包单位"
          allowClear
          enterButton={<SearchOutlined />}
          onSearch={handleSearch}
          onChange={handleSearchChange}
          style={{ width: 300 }}
        />,
      ]}
      locale={{ emptyText }}
    />
  );
};

export default BondPendingTable;
