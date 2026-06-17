import { COLORS } from '@/constants/colors';
import { Col } from 'antd';
import React from 'react';

export interface DetailItemProps {
  label: string;
  value: React.ReactNode;
  span?: number;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value, span = 12 }) => (
  <Col span={span} style={{ marginBottom: '16px' }}>
    <div style={{ fontSize: '13px', color: COLORS.textTertiary, marginBottom: '6px' }}>{label}</div>
    <div style={{ fontSize: '14px', color: COLORS.text }}>{value}</div>
  </Col>
);

export default DetailItem;
