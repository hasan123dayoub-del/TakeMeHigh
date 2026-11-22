/** GET /payments list item */
export interface PaymentListItem {
  id: string;
  bookingId: string;
  branchId: string;
  amount: string;
  currencyCode: string;
  method: 'CASH';
  receiptNumber: string;
  paidAt: string;
  notes: string | null;
  refundedAmount: string;
  booking: { id: string; reference: string; customer: { fullName: string }; trip: { code: string } };
  recordedBy: { user: { fullName: string } } | null;
}

/** GET /refunds list item */
export interface RefundListItem {
  id: string;
  paymentId: string;
  bookingId: string;
  amount: string;
  currencyCode: string;
  reason: string;
  refundedAt: string;
  payment: { receiptNumber: string };
  booking: { id: string; reference: string; customer: { fullName: string } };
  recordedBy: { user: { fullName: string } } | null;
}

/** GET /payments/:id/receipt */
export interface PaymentReceipt {
  id: string;
  bookingId: string;
  amount: string;
  currencyCode: string;
  method: 'CASH';
  receiptNumber: string;
  paidAt: string;
  notes: string | null;
  refundedAmount: string;
  office: { name: string; phone: string | null; address: string | null; logoUrl: string | null };
  branch: { name: string };
  booking: {
    reference: string;
    totalAmount: string;
    paidAmount: string;
    currencyCode: string;
    customer: { fullName: string; phone: string };
    trip: { code: string; departureDate: string; tour: { name: string } };
  };
  refunds: Array<{ id: string; amount: string; currencyCode: string; reason: string; refundedAt: string }>;
  recordedBy: { user: { fullName: string } } | null;
}

export interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
}
