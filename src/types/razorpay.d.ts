declare module 'razorpay' {
  interface RazorpayOptions {
    key_id: string;
    key_secret: string;
  }

  interface OrderCreateParams {
    amount: number;
    currency: string;
    receipt?: string;
    notes?: Record<string, string>;
    partial_payment?: boolean;
  }

  interface Order {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    created_at: number;
  }

  interface PaymentFetchParams {
    payment_id: string;
  }

  interface Payment {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
    order_id: string;
    method: string;
    captured: boolean;
    description: string;
    email: string;
    contact: string;
    notes: Record<string, string>;
    created_at: number;
  }

  interface RefundCreateParams {
    amount?: number;
    speed?: 'normal' | 'optimum';
    notes?: Record<string, string>;
  }

  interface Refund {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    payment_id: string;
    status: string;
    created_at: number;
  }

  class Razorpay {
    constructor(options: RazorpayOptions);
    
    orders: {
      create(params: OrderCreateParams): Promise<Order>;
      fetch(orderId: string): Promise<Order>;
      all(params?: { from?: number; to?: number; count?: number; skip?: number }): Promise<{ items: Order[] }>;
    };
    
    payments: {
      fetch(paymentId: string): Promise<Payment>;
      capture(paymentId: string, amount: number, currency: string): Promise<Payment>;
      refund(paymentId: string, params?: RefundCreateParams): Promise<Refund>;
    };
  }

  export = Razorpay;
}
