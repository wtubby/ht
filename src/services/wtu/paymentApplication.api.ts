import { apiGet } from './client';

/** 获取支付申请表数据 GET /api/payment-applications/:paymentId */
export async function getPaymentApplicationData(paymentId: number) {
  return apiGet<{
    success: boolean;
    data: API.PaymentApplicationData;
    message?: string;
  }>(`/api/payment-applications/${paymentId}`);
}
