import AmountProgressStatCard from '@/components/AmountProgressStatCard';
import AttachmentPanel from '@/components/AttachmentPanel';
import { RECORD_DETAIL_CARD_STYLE } from '@/components/RecordDetail/shared';
import { MODULE_COLORS } from '@/constants/colors';
import { getContractStatusColor, RECEIVE_AMOUNT_STAT_HINT } from '@/constants/statusColors';
import { calcProgressPct } from '@/utils/format';
import { FileTextOutlined } from '@ant-design/icons';
import { Card, Col, Descriptions, Row, Tag } from 'antd';
import React, { useMemo } from 'react';

interface ContractBasicInfoCardProps {
  currentRecord: API.MainContract;
  receives: API.Receive[];
  invoices: API.InvoiceOut[];
  files: API.File[];
  onFilePreview: (file: API.File) => void;
}

const ContractBasicInfoCard: React.FC<ContractBasicInfoCardProps> = ({
  currentRecord,
  receives,
  invoices,
  files,
  onFilePreview,
}) => {
  const statCardsData = useMemo(() => {
    const receivesTotal = receives.reduce((sum, r) => sum + Number(r.receive_amount || 0), 0);
    const invoiceTotal = invoices.reduce((sum, i) => sum + Number(i.invoice_amount || 0), 0);
    const base =
      Number(currentRecord?.amount_settlement) || Number(currentRecord?.amount_contract) || 0;
    const receivesPct = calcProgressPct(receivesTotal, base);
    const invoicePct = calcProgressPct(invoiceTotal, base);

    return [
      {
        label: '合同金额',
        value: Number(currentRecord?.amount_contract || 0),
        barColor: MODULE_COLORS.mainContract.bg,
        textColor: MODULE_COLORS.mainContract.color,
        pct: null as number | null,
      },
      {
        label: '结算金额',
        value: Number(currentRecord?.amount_settlement || 0),
        barColor: MODULE_COLORS.mainContract.bg,
        textColor: MODULE_COLORS.mainContract.color,
        pct: null,
      },
      {
        label: '收款总额',
        value: receivesTotal,
        barColor: MODULE_COLORS.receive.bg,
        textColor: MODULE_COLORS.receive.color,
        pct: receivesPct,
        statHint: RECEIVE_AMOUNT_STAT_HINT,
      },
      {
        label: '开票总额',
        value: invoiceTotal,
        barColor: MODULE_COLORS.invoiceOut.bg,
        textColor: MODULE_COLORS.invoiceOut.color,
        pct: invoicePct,
      },
    ];
  }, [receives, invoices, currentRecord]);

  return (
    <Row gutter={24}>
      <Col span={16}>
        <Card
          variant="borderless"
          style={RECORD_DETAIL_CARD_STYLE}
        >
          {/* 金额统计卡片 */}
          <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
            {statCardsData.map((card, idx) => (
              <Col key={idx} xs={24} sm={12} xl={6}>
                <AmountProgressStatCard
                  label={card.label}
                  value={card.value}
                  barColor={card.barColor}
                  textColor={card.textColor}
                  pct={card.pct}
                  statHint={'statHint' in card ? card.statHint : undefined}
                />
              </Col>
            ))}
          </Row>

          <Descriptions
            column={2}
            bordered
            styles={{
              label: {
                width: '100px',
                padding: '12px 8px',
                textAlign: 'center',
              },
              content: {
                wordBreak: 'break-word',
                padding: '12px 8px',
              },
            }}
          >
            <Descriptions.Item label="合同名称" span={2}>
              <span style={{ marginRight: '10px' }}>{currentRecord.contract_name}</span>
              <Tag color={getContractStatusColor(currentRecord.contract_status!)}>
                {currentRecord.contract_status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发包单位">
              {currentRecord.partyA?.company_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="承包单位">
              {currentRecord.partyB?.company_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="签约日期">
              {currentRecord.date_signed || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="保修日期">
              {currentRecord.warranty_years != null && currentRecord.date_warranty
                ? `${currentRecord.warranty_years}年（${currentRecord.date_warranty}截止）`
                : currentRecord.warranty_years != null
                  ? `${currentRecord.warranty_years}年`
                  : currentRecord.date_warranty
                    ? `${currentRecord.date_warranty}截止`
                    : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="开工日期">
              {currentRecord.date_start || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="竣工日期">{currentRecord.date_end || '-'}</Descriptions.Item>
           
            <Descriptions.Item label="备注" span={2}>
              <div
                style={{
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {currentRecord.remarks || '-'}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="创建人">
              {currentRecord.creator?.full_name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {currentRecord.created_at || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Col>

      <Col span={8}>
        <AttachmentPanel
          title="合同附件"
          files={files}
          onPreview={onFilePreview}
          iconColor={MODULE_COLORS.mainContract.color}
          fileIcon={<FileTextOutlined />}
        />
      </Col>
    </Row>
  );
};

export default ContractBasicInfoCard;
