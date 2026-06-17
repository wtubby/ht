import type { BusinessFileUploaderRef } from '@/components/BusinessFileUploader';
import BusinessFileUploader from '@/components/BusinessFileUploader';
import { COLORS } from '@/constants/colors';
import {
  fillFormFromOcrData,
  getInvoiceRenameFields,
  SECTION_TITLE_STYLE,
} from '@/pages/Invoice/invoiceForm.shared';
import type { ProFormInstance } from '@ant-design/pro-components';
import { Col, Tooltip } from 'antd';
import React, { type RefObject } from 'react';

interface InvoiceFormAttachmentPanelProps {
  isEditMode: boolean;
  effectiveId: number | null | undefined;
  moduleType: 'FB_INVOICE' | 'ZB_INVOICE';
  mainContractId?: number;
  subContractId?: number;
  formRef: RefObject<ProFormInstance | undefined>;
  fileUploaderRef: RefObject<BusinessFileUploaderRef | null>;
  onFilesChanged: () => void;
}

const InvoiceFormAttachmentPanel: React.FC<InvoiceFormAttachmentPanelProps> = ({
  isEditMode,
  effectiveId,
  moduleType,
  mainContractId,
  subContractId,
  formRef,
  fileUploaderRef,
  onFilesChanged,
}) => (
  <Col span={8}>
    <div style={{ paddingLeft: 16, borderLeft: `1px solid ${COLORS.border}` }}>
      <div style={SECTION_TITLE_STYLE}>发票附件</div>
      <Tooltip title={!isEditMode ? '请先保存发票信息，保存成功后可上传附件' : undefined}>
        <div>
          <BusinessFileUploader
            ref={fileUploaderRef as RefObject<BusinessFileUploaderRef>}
            moduleType={moduleType}
            recordId={effectiveId ?? undefined}
            mainContractId={mainContractId}
            subContractId={subContractId}
            showOcrButton
            onOcrComplete={(data) => fillFormFromOcrData(formRef, data)}
            getInvoiceRenameFields={() => getInvoiceRenameFields(formRef)}
            disabled={!isEditMode}
            onFilesChanged={onFilesChanged}
          />
        </div>
      </Tooltip>
    </div>
  </Col>
);

export default InvoiceFormAttachmentPanel;
