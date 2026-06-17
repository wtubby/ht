import AttachmentPanel from '@/components/AttachmentPanel';
import DetailItem from '@/components/DetailItem';
import FilePreviewArea from '@/components/FilePreviewArea';
import {
  AmountRatioRow,
  formatRecordDetailTitle,
  RECORD_DETAIL_CARD_STYLE,
  RECORD_DETAIL_DRAWER_BODY_STYLE,
  RECORD_DETAIL_DRAWER_WIDTH,
  RemarkValue,
  sectionTitleStyle,
} from '@/components/RecordDetail/shared';
import { COLORS, MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import { getReceiveStatusColor } from '@/constants/statusColors';
import { useReceive } from '@/hooks';
import { useFilePreview } from '@/hooks/useFilePreview';
import { getFiles } from '@/services/wtu/file.api';
import { formatCurrency } from '@/utils/format';
import { CalendarOutlined, DollarOutlined, ProjectOutlined } from '@ant-design/icons';
import { App, Card, Col, Drawer, Row, Spin, Tag } from 'antd';
import React, { useEffect, useState } from 'react';

interface ReceiveDetailProps {
  visible: boolean;
  currentRecord?: API.Receive;
  onCancel: () => void;
}

const MAX_FILE_PAGE_SIZE = 1000;

const ReceiveDetail: React.FC<ReceiveDetailProps> = ({ visible, currentRecord, onCancel }) => {
  const { message: antdMessage } = App.useApp();
  const [files, setFiles] = useState<API.File[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const { previewVisible, previewFile, handleFilePreview, handlePreviewClose } = useFilePreview();

  const recordId = currentRecord?.id ?? 0;
  const detailEnabled = visible && !!currentRecord?.id;
  const {
    data: detailResponse,
    isLoading,
    isFetching,
    isError,
  } = useReceive(recordId, detailEnabled);
  const typedResponse = detailResponse as { success?: boolean; data?: API.Receive } | undefined;
  const displayData =
    typedResponse?.success && typedResponse.data ? typedResponse.data : (currentRecord ?? null);
  const detailLoading = detailEnabled && (isLoading || isFetching);
  const loading = detailLoading || fileLoading;

  useEffect(() => {
    if (!visible) {
      setFiles([]);
      handlePreviewClose();
    }
  }, [visible, handlePreviewClose]);

  useEffect(() => {
    if (isError) {
      antdMessage.error('加载收款详情失败');
    }
  }, [isError, antdMessage]);

  useEffect(() => {
    const loadFiles = async () => {
      if (!visible || !displayData?.id || !displayData.main_contract_id) {
        return;
      }

      setFileLoading(true);
      try {
        const fileResponse = await getFiles({
          file_module: 'ZB_RECEIVE',
          main_contract_id: displayData.main_contract_id,
          record_id: displayData.id,
          pageSize: MAX_FILE_PAGE_SIZE,
        });

        if (fileResponse?.success && fileResponse?.data) {
          setFiles(fileResponse.data as API.File[]);
        }
      } catch (error) {
        antdMessage.error('加载文件列表失败');
      } finally {
        setFileLoading(false);
      }
    };

    loadFiles();
  }, [visible, displayData?.id, displayData?.main_contract_id, antdMessage]);

  const receiveTitle = formatRecordDetailTitle(
    displayData?.mainContract?.contract_name ?? currentRecord?.mainContract?.contract_name,
    '收款详情',
  );

  const receiveAmount = displayData?.receive_amount ?? 0;
  const mainContractAmount = displayData?.mainContract?.amount_contract;

  return (
    <Drawer
      title={receiveTitle}
      open={visible}
      onClose={onCancel}
      width={RECORD_DETAIL_DRAWER_WIDTH}
      destroyOnClose
      styles={{ body: RECORD_DETAIL_DRAWER_BODY_STYLE }}
    >
      {!displayData ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Spin spinning={loading}>
          <Row gutter={16}>
            <Col span={16}>
              <Card
                variant="borderless"
                style={RECORD_DETAIL_CARD_STYLE}
                styles={{ body: { padding: '24px' } }}
              >
                <h3 style={sectionTitleStyle(MODULE_COLORS.receive.color, { isFirst: true })}>
                  <DollarOutlined style={{ marginRight: '8px' }} />
                  收款信息
                </h3>

                <Row gutter={24}>
                  <Col span={8}>
                    <div
                      style={{
                        background: MODULE_COLORS.receive.bg,
                        borderRadius: '6px',
                        padding: '16px',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ width: '100%' }}>
                        <AmountRatioRow
                          currentAmount={receiveAmount}
                          contractAmount={mainContractAmount}
                          totalAmount={displayData.total_received}
                          totalTooltipLabel="累计收款"
                        />
                        <div
                          style={{
                            fontSize: '28px',
                            fontWeight: 900,
                            color: MODULE_COLORS.receive.color,
                            lineHeight: 1.1,
                            marginBottom: displayData.receive_status ? 4 : 8,
                          }}
                        >
                          {formatCurrency(receiveAmount)}
                        </div>
                        {displayData.receive_status && (
                          <Tag
                            color={getReceiveStatusColor(displayData.receive_status)}
                            style={{
                              fontSize: 12,
                              lineHeight: '18px',
                              padding: '0 6px',
                              margin: 0,
                            }}
                          >
                            {displayData.receive_status}
                          </Tag>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: '5px',
                          paddingTop: '5px',
                          borderTop: `1px dashed ${MODULE_COLORS.receive.color}`,
                          width: '100%',
                          color: COLORS.textSecondary,
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CalendarOutlined style={{ marginRight: 6 }} />
                        <span style={{ fontWeight: 500 }}>收款日期：</span>
                        {displayData.receive_date || '-'}
                      </div>
                    </div>
                  </Col>

                  <Col span={16}>
                    <Row gutter={24}>
                      <DetailItem
                        label="账户户名"
                        value={displayData.account_name || '-'}
                        span={12}
                      />
                      <DetailItem label="开户银行" value={displayData.bank_name || '-'} span={12} />
                      <DetailItem
                        label="账户号码"
                        value={displayData.account_number || '-'}
                        span={12}
                      />
                      <DetailItem
                        label="备注"
                        value={<RemarkValue value={displayData.remarks} />}
                        span={12}
                      />
                    </Row>
                  </Col>
                </Row>

                <h3 style={sectionTitleStyle(MODULE_COLORS.mainContract.color)}>
                  <ProjectOutlined style={{ marginRight: '8px' }} />
                  总包合同信息
                </h3>
                <Row gutter={24}>
                  <DetailItem
                    label="合同名称"
                    value={displayData.mainContract?.contract_name || '-'}
                    span={12}
                  />
                  <DetailItem
                    label="合同金额"
                    value={
                      <span style={{ color: UI_COLORS.amount, fontWeight: 600 }}>
                        {formatCurrency(displayData.mainContract?.amount_contract ?? 0)}
                      </span>
                    }
                    span={12}
                  />
                  <DetailItem
                    label="付款方 (发包单位)"
                    value={displayData.payer_name || '-'}
                    span={12}
                  />
                  <DetailItem
                    label="承包单位"
                    value={displayData.mainContract?.partyB?.company_name || '-'}
                    span={12}
                  />
                </Row>
              </Card>
            </Col>

            <Col span={8}>
              <AttachmentPanel
                title="收款附件"
                files={files}
                onPreview={handleFilePreview}
                iconColor={MODULE_COLORS.receive.color}
              />
            </Col>
          </Row>
        </Spin>
      )}

      <FilePreviewArea
        previewVisible={previewVisible}
        previewFile={previewFile}
        onClose={handlePreviewClose}
      />
    </Drawer>
  );
};

export default ReceiveDetail;
