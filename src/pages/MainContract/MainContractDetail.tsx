import FilePreviewArea from '@/components/FilePreviewArea';
import {
  formatRecordDetailTitle,
  RECORD_DETAIL_DRAWER_BODY_STYLE,
  RECORD_DETAIL_DRAWER_WIDTH,
} from '@/components/RecordDetail/shared';
import { MODULE_COLORS } from '@/constants/colors';
import { useMainContract, useMainContractRelated } from '@/hooks';
import { useFilePreview } from '@/hooks/useFilePreview';
import { selectApiDetail } from '@/utils/apiResponse';
import {
  DollarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { App, Button, Drawer, Spin, Tabs } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import ContractBasicInfoCard from './ContractBasicInfoCard';
import InvoiceOutTableCard from './InvoiceOutTableCard';
import ReceiveTableCard from './ReceiveTableCard';
import SubContractTableCard from './SubContractTableCard';

interface MainContractDetailProps {
  visible: boolean;
  currentRecord?: API.MainContract;
  onCancel: () => void;
}

const MainContractDetail: React.FC<MainContractDetailProps> = ({
  visible,
  currentRecord,
  onCancel,
}) => {
  const { message } = App.useApp();
  const [selectedReceiveKeys, setSelectedReceiveKeys] = useState<React.Key[]>([]);
  const [selectedInvoiceKeys, setSelectedInvoiceKeys] = useState<React.Key[]>([]);
  const [selectedSubContractKeys, setSelectedSubContractKeys] = useState<React.Key[]>([]);
  const { previewVisible, previewFile, handleFilePreview, handlePreviewClose } = useFilePreview();

  const recordId = currentRecord?.id ?? 0;
  const detailEnabled = visible && !!currentRecord?.id;

  const {
    data: detailResponse,
    isLoading: basicLoading,
    isFetching: basicFetching,
    isError: basicError,
  } = useMainContract(recordId, detailEnabled);
  const displayRecord =
    selectApiDetail<API.MainContract>(detailResponse) ?? currentRecord ?? null;

  const {
    data: relatedData,
    isLoading: relatedLoading,
    isFetching: relatedFetching,
    isError: relatedError,
  } = useMainContractRelated(recordId, detailEnabled);

  const receives = relatedData?.receives ?? [];
  const invoices = relatedData?.invoiceOuts ?? [];
  const subContracts = relatedData?.subContracts ?? [];
  const files = relatedData?.files ?? [];

  const loading =
    detailEnabled && (basicLoading || basicFetching || relatedLoading || relatedFetching);

  const subContractStats = useMemo(() => {
    const statsMap = new Map<number, { paymentTotal: number; invoiceTotal: number }>();
    Object.entries(relatedData?.subContractStats ?? {}).forEach(([id, stats]) => {
      statsMap.set(Number(id), stats);
    });
    return statsMap;
  }, [relatedData?.subContractStats]);

  useEffect(() => {
    if (basicError) {
      message.error('加载合同详情失败');
    }
  }, [basicError, message]);

  useEffect(() => {
    if (relatedError) {
      message.error('加载合同关联数据失败');
    }
  }, [relatedError, message]);

  useEffect(() => {
    if (visible && relatedData) {
      setSelectedReceiveKeys(relatedData.receives.map((item) => item.id!));
      setSelectedInvoiceKeys(relatedData.invoiceOuts.map((item) => item.id!));
    } else if (!visible) {
      setSelectedReceiveKeys([]);
      setSelectedInvoiceKeys([]);
    }
  }, [visible, relatedData]);

  const contractTitle = formatRecordDetailTitle(
    displayRecord?.contract_name ?? currentRecord?.contract_name,
    '总包合同详情',
  );

  return (
    <Drawer
      title={
        <div>
          <FileTextOutlined
            style={{ marginRight: '8px', color: MODULE_COLORS.mainContract.color }}
          />
          {contractTitle}
        </div>
      }
      open={visible}
      onClose={onCancel}
      width={RECORD_DETAIL_DRAWER_WIDTH}
      destroyOnClose
      styles={{ body: RECORD_DETAIL_DRAWER_BODY_STYLE }}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onCancel}>关闭</Button>
        </div>
      }
    >
      <Spin spinning={loading}>
        {detailEnabled && displayRecord && (
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: (
                  <span>
                    <FileTextOutlined style={{ color: MODULE_COLORS.mainContract.color }} />
                    基本信息
                  </span>
                ),
                children: (
                  <ContractBasicInfoCard
                    currentRecord={displayRecord}
                    receives={receives}
                    invoices={invoices}
                    files={files}
                    onFilePreview={handleFilePreview}
                  />
                ),
              },
              {
                key: 'receives',
                label: (
                  <span>
                    <DollarOutlined style={{ color: MODULE_COLORS.receive.color }} />
                    收款记录 ({receives.length})
                  </span>
                ),
                children: (
                  <ReceiveTableCard
                    receives={receives}
                    selectedKeys={selectedReceiveKeys}
                    loading={relatedLoading || relatedFetching}
                    onSelectionChange={setSelectedReceiveKeys}
                  />
                ),
              },
              {
                key: 'invoices',
                label: (
                  <span>
                    <FileDoneOutlined style={{ color: MODULE_COLORS.invoiceOut.color }} />
                    开票记录 ({invoices.length})
                  </span>
                ),
                children: (
                  <InvoiceOutTableCard
                    invoices={invoices}
                    selectedKeys={selectedInvoiceKeys}
                    loading={relatedLoading || relatedFetching}
                    onSelectionChange={setSelectedInvoiceKeys}
                  />
                ),
              },
              {
                key: 'subContracts',
                label: (
                  <span>
                    <TeamOutlined style={{ color: MODULE_COLORS.subContract.color }} />
                    分包合同 ({subContracts.length})
                  </span>
                ),
                children: (
                  <SubContractTableCard
                    subContracts={subContracts}
                    subContractStats={subContractStats}
                    selectedKeys={selectedSubContractKeys}
                    loading={relatedLoading || relatedFetching}
                    onSelectionChange={setSelectedSubContractKeys}
                  />
                ),
              },
            ]}
          />
        )}
      </Spin>

      <FilePreviewArea
        previewVisible={previewVisible}
        previewFile={previewFile}
        onClose={handlePreviewClose}
      />
    </Drawer>
  );
};

export default MainContractDetail;
