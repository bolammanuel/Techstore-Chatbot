declare module '@paystack/inline-js' {
  export interface PaystackTransaction {
    reference: string;
    status?: string;
    message?: string;
    [key: string]: any;
  }

  export interface PaystackTransactionOptions {
    key: string;
    email: string;
    amount: number;
    reference: string;
    onSuccess: (transaction: PaystackTransaction) => void;
    onCancel?: () => void;
  }

  export default class PaystackPop {
    constructor();
    newTransaction(options: PaystackTransactionOptions): void;
  }
}
