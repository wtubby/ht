import AttachmentPanel from '@/components/AttachmentPanel';
import DetailItem from '@/components/DetailItem';
import FilePreviewArea from '@/components/FilePreviewArea';
import {
  formatRecordDetailTitle,
  RECORD_DETAIL_CARD_STYLE,
  RECORD_DETAIL_DRAWER_BODY_STYLE,
  RECORD_DETAIL_DRAWER_WIDTH,
  RemarkValue,
  sectionTitleStyle,
} from '@/components/RecordDetail/shared';
import { COLORS, MODULE_COLORS } from '@/constants/colors';
import { useInvoiceIn } from '@/hooks';
import { useFilePreview } from '@/hooks/useFilePreview';
import { getFiles } from '@/services/wtu/file.api';
import { formatCurrency } from '@/utils/format';
import {
  AuditOutlined,
  CalendarOutlined,
  FileOutlined,
  FileTextOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Card, Col, Drawer, Row, Spin, App } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';

interface InvoiceInDetailProps {
  visible: boolean;
  currentRecord?: API.InvoiceIn;
  onCancel: () => void;
}

const InvoiceInDetail: React.FC<InvoiceInDetailProps> = ({ visible, currentRecord, onCancel }) => {
  const { message } = App.useApp();
  const [files, setFiles] = useState<API.File[]>([]);
  const recordId = currentRecord?.id ?? 0;
  const detailEnabled = visible && !!currentRecord?.id;

  const { data: detailResponse, isLoading, isFetching } = useInvoiceIn(recordId, detailEnabled);
  const typedResponse = detailResponse as { success?: boolean; data?: API.InvoiceIn } | undefined;
  const data = typedResponse?.success && typedResponse.data ? typedResponse.data : null;
  const loading = isLoading || isFetching;

  const { previewVisible, previewFile, handleFilePreview, handlePreviewClose } = useFilePreview();

  useEffect(() => {
    const loadFiles = async () => {
      if (!currentRecord?.id) return;
      try {
        const response = await getFiles({
          file_module: 'FB_INVOICE',
          record_id: currentRecord.id,
          pageSize: 1000,
        });
        if (response.success && response.data) {
          setFiles(response.data as API.File[]);
        }
      } catch (error) {
        message.error('加载文件列表失败');
      }
    };

    if (detailEnabled) {
      loadFiles();
    } else {
      setFiles([]);
      handlePreviewClose();
    }
  }, [detailEnabled, currentRecord?.id, handlePreviewClose, message]);

  const invoiceTitle = formatRecordDetailTitle(
    data?.subContract?.contract_name ?? currentRecord?.subContract?.contract_name,
    '进项发票详情',
  );

  if (!data) {
    return (
      <Drawer
        title={invoiceTitle}
        open={visible}
        onClose={onCancel}
        width={RECORD_DETAIL_DRAWER_WIDTH}
        destroyOnClose
        styles={{ body: RECORD_DETAIL_DRAWER_BODY_STYLE }}
      >
        <Spin spinning={loading} />
      </Drawer>
    );
  }

  return (
    <Drawer
      title={invoiceTitle}
      open={visible}
      onClose={onCancel}
      width={RECORD_DETAIL_DRAWER_WIDTH}
      destroyOnClose
      styles={{ body: RECORD_DETAIL_DRAWER_BODY_STYLE }}
    >
      <Spin spinning={loading}>
        <Row gutter={16}>
          <Col span={16}>
            <Card
              variant="borderless"
              style={RECORD_DETAIL_CARD_STYLE}
              styles={{ body: { padding: '24px' } }}
            >
              <h3 style={sectionTitleStyle(MODULE_COLORS.invoiceIn.color, { isFirst: true })}>
                <FileOutlined style={{ marginRight: '8px' }} />
                进项发票信息
              </h3>

              <Row gutter={24}>
                <Col span={8}>
                  <div
                    style={{
                      background: MODULE_COLORS.invoiceIn.bg,
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
                      <div
                        style={{
                          fontSize: '14px',
                          color: MODULE_COLORS.invoiceIn.color,
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>发票金额</span>
                        {data.tax_rate !== null && data.tax_rate !== undefined && (
                          <span style={{ fontSize: '13px', color: MODULE_COLORS.invoiceIn.color }}>
                            税率: {data.tax_rate}%
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '28px',
                          fontWeight: 900,
                          color: MODULE_COLORS.invoiceIn.color,
                          lineHeight: 1.1,
                          marginBottom: '8px',
                        }}
                      >
                        {formatCurrency(data.invoice_amount)}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '5px',
                        paddingTop: '5px',
                        borderTop: `1px dashed ${MODULE_COLORS.invoiceIn.color}`,
                        width: '100%',
                        color: COLORS.textSecondary,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CalendarOutlined style={{ marginRight: 6 }} />
                      <span style={{ fontWeight: 500 }}>开票日期：</span>
                      {data.invoice_date ? dayjs(data.invoice_date).format('YYYY-MM-DD') : '-'}
                    </div>
                  </div>
                </Col>

                <Col span={16}>
                  <Row gutter={24}>
                    <DetailItem label="购买方" value={data.buyer || '-'} span={12} />
                    <DetailItem label="销售方" value={data.seller || '-'} span={12} />
                    <DetailItem
                      label="发票号码"
                      value={<span style={{ fontWeight: 500 }}>{data.invoice_no || '-'}</span>}
                      span={12}
                    />
                    <DetailItem
                      label="备注"
                      value={<RemarkValue value={data.remarks} />}
                      span={12}
                    />
                  </Row>
                </Col>
              </Row>

              <h3 style={sectionTitleStyle(MODULE_COLORS.subContract.color)}>
                <SwapOutlined style={{ marginRight: '8px' }} />
                分包合同信息
              </h3>
              <Row gutter={24}>
                <DetailItem
                  label="合同名称"
                  value={data.subContract?.contract_name || '-'}
                  span={12}
                />
                <DetailItem
                  label="合同金额"
                  value={
                    data.subContract?.amount_contract != null
                      ? formatCurrency(data.subContract.amount_contract)
                      : '-'
                  }
                  span={12}
                />
                <DetailItem label="付款方 (发票单位)" value={data.buyer || '-'} span={12} />
                <DetailItem label="收款方 (承包单位)" value={data.seller || '-'} span={12} />
              </Row>

              <h3 style={sectionTitleStyle(MODULE_COLORS.invoiceIn.color)}>
                <AuditOutlined style={{ marginRight: '8px' }} />
                审计信息
              </h3>
              <Row gutter={24}>
                <DetailItem label="创建人" value={data.creator?.full_name || '-'} span={8} />
                <DetailItem
                  label="创建时间"
                  value={data.created_at ? dayjs(data.created_at).format('YYYY-MM-DD HH:mm') : '-'}
                  span={8}
                />
                <DetailItem
                  label="更新时间"
                  value={data.updated_at ? dayjs(data.updated_at).format('YYYY-MM-DD HH:mm') : '-'}
                  span={8}
                />
              </Row>
            </Card>
          </Col>

          <Col span={8}>
            <AttachmentPanel
              title="发票附件"
              files={files}
              onPreview={handleFilePreview}
              iconColor={MODULE_COLORS.invoiceIn.color}
              fileIcon={<FileTextOutlined />}
            />
          </Col>
        </Row>
      </Spin>

      <FilePreviewArea
        previewVisible={previewVisible}
        previewFile={previewFile}
        onClose={handlePreviewClose}
      />
    </Drawer>
  );
};

export default InvoiceInDetail;
