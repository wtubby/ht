import { COLORS } from '@/constants/colors';
import { bankAccountDefaultTagColor, getBankAccountStatusColor } from '@/constants/statusColors';
import { companyKeys, useCompanyBankAccounts } from '@/hooks';
import {
  removeBankAccount,
  setDefaultBankAccount,
  updateBankAccount,
} from '@/services/wtu/bankAccount.api';
import { getErrorMessage } from '@/utils/apiError';
import {
  BANK_ACCOUNT_DEFAULT_STATUS,
  BANK_ACCOUNT_EDIT_STATUSES,
  isDefaultBankAccount,
  isSelectableBankAccount,
  maskBankAccountNumber,
  pickStatusPayload,
  type BankAccountEditStatus,
  type BankAccountStatus,
} from '@/utils/companyBankAccount';
import { DeleteOutlined, EditOutlined, PlusOutlined, StarFilled } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import type { MenuProps } from 'antd';
import { App, Button, Card, Dropdown, Empty, Popconfirm, Space, Spin, Tag, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import CompanyBankFormModal from './CompanyBankFormModal';

const { Text } = Typography;

interface CompanyBankSectionProps {
  companyId: number;
  /** 当前详情 Tab 是否选中（用于懒加载查询） */
  tabActive: boolean;
}

const CompanyBankSection: React.FC<CompanyBankSectionProps> = ({ companyId, tabActive }) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<API.CompanyBankAccount | null>(null);

  const {
    data: bankAccounts = [],
    isLoading,
    isFetching,
  } = useCompanyBankAccounts(companyId, {
    enabled: tabActive && companyId > 0,
  });

  const loading = isLoading || isFetching;

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: companyKeys.bankAccounts(companyId) });
  }, [queryClient, companyId]);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (account: API.CompanyBankAccount) => {
    setEditingAccount(account);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingAccount(null);
  };

  const handleSetDefault = async (account: API.CompanyBankAccount) => {
    if (!account.id) return;
    if (!isSelectableBankAccount(account)) {
      message.warning('仅“正常”状态账户可设为默认');
      return;
    }
    const hide = message.loading('正在设置默认账户');
    try {
      await setDefaultBankAccount(account.id);
      hide();
      message.success('已设为默认账户');
      await invalidate();
    } catch (error) {
      hide();
      message.error(getErrorMessage(error, '设置默认账户失败'));
    }
  };

  const handleStatusChange = async (
    account: API.CompanyBankAccount,
    status: BankAccountStatus,
  ) => {
    if (!account.id) return;
    const hide = message.loading('正在更新状态');
    try {
      await updateBankAccount(account.id, pickStatusPayload(account, status));
      hide();
      message.success('状态更新成功');
      await invalidate();
    } catch (error) {
      hide();
      message.error(getErrorMessage(error, '状态更新失败'));
    }
  };

  const handleDelete = async (account: API.CompanyBankAccount) => {
    if (!account.id) return;
    const hide = message.loading('正在删除');
    try {
      await removeBankAccount(account.id);
      hide();
      message.success('删除成功');
      await invalidate();
    } catch (error) {
      hide();
      message.error(getErrorMessage(error, '删除失败'));
    }
  };

  const buildStatusMenu = (account: API.CompanyBankAccount): MenuProps['items'] => {
    if (account.account_status === '销户') return [];
    const current = account.account_status || BANK_ACCOUNT_DEFAULT_STATUS;
    return BANK_ACCOUNT_EDIT_STATUSES.map((status) => ({
      key: status,
      label: `设为${status}`,
      disabled: current === status,
    }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin />
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
          添加账户
        </Button>
      </div>

      {bankAccounts.length === 0 ? (
        <Empty description="暂无银行账户">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
            添加首个账户
          </Button>
        </Empty>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {bankAccounts.map((account) => {
            const status = account.account_status || BANK_ACCOUNT_DEFAULT_STATUS;
            const isCancelled = status === '销户';

            return (
              <Card
                key={account.id}
                size="small"
                style={{ borderRadius: 8, background: COLORS.bgSubtle }}
                styles={{ body: { padding: '12px 16px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={8} wrap style={{ marginBottom: 6 }}>
                      <Text strong>{account.account_name}</Text>
                      {isDefaultBankAccount(account) && (
                        <Tag
                          color={bankAccountDefaultTagColor}
                          icon={<StarFilled />}
                          style={{ margin: 0, borderRadius: 12 }}
                        >
                          默认
                        </Tag>
                      )}
                      <Tag color={getBankAccountStatusColor(status)}>{status}</Tag>
                    </Space>
                    <div style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: '22px' }}>
                      <div>{maskBankAccountNumber(account.account_number)}</div>
                      <div>{account.bank_name}</div>
                      {account.remarks ? (
                        <div style={{ color: COLORS.textTertiary }}>备注：{account.remarks}</div>
                      ) : null}
                    </div>
                  </div>

                  <Space size={4} wrap style={{ flexShrink: 0 }}>
                    {!isCancelled && (
                      <>
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleOpenEdit(account)}
                        >
                          编辑
                        </Button>
                        {!isDefaultBankAccount(account) && isSelectableBankAccount(account) && (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => handleSetDefault(account)}
                          >
                            设为默认
                          </Button>
                        )}
                        <Dropdown
                          menu={{
                            items: buildStatusMenu(account),
                            onClick: ({ key }) =>
                              handleStatusChange(account, key as BankAccountEditStatus),
                          }}
                        >
                          <Button type="link" size="small">
                            改状态
                          </Button>
                        </Dropdown>
                        <Popconfirm
                          title="确认销户？"
                          description="销户后不可恢复为正常，且不可再用于收付款。"
                          onConfirm={() => handleStatusChange(account, '销户')}
                        >
                          <Button type="link" size="small" danger>
                            销户
                          </Button>
                        </Popconfirm>
                      </>
                    )}
                    <Popconfirm
                      title="确认删除该银行账户？"
                      description={isCancelled ? '该账户已销户，删除后将不再展示。' : undefined}
                      onConfirm={() => handleDelete(account)}
                    >
                      <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            );
          })}
        </Space>
      )}

      <CompanyBankFormModal
        open={modalOpen}
        companyId={companyId}
        account={editingAccount}
        onClose={handleCloseModal}
        onSuccess={invalidate}
      />
    </>
  );
};

export default CompanyBankSection;
