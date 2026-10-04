import { verifyPaystackSignature } from "@/lib/billing/rules";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_API_URL =
  process.env.PAYSTACK_API_URL || "https://api.paystack.co";

export interface InitializeSubscriptionParams {
  email: string;
  planCode: string;
  amount: number;
  callbackUrl: string;
  metadata?: Record<string, any>;
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    paid_at?: string | null;
    customer: {
      id: number;
      customer_code: string;
      email: string;
      first_name?: string;
      last_name?: string;
    };
    authorization: {
      authorization_code: string;
      card_type: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      bank: string;
      channel: string;
    };
    /** Paystack sends the plan code as a string here; plan_object has details. */
    plan?: string | { id: number; plan_code: string; name: string } | null;
    plan_object?: { plan_code?: string; interval?: string } | null;
    metadata?: Record<string, any> | null;
    subscription?: {
      subscription_code: string;
      email_token: string;
      next_payment_date: string;
      amount: number;
    };
  };
}

export interface CreatePlanParams {
  name: string;
  amount: number;
  interval:
    | "daily"
    | "weekly"
    | "monthly"
    | "quarterly"
    | "biannually"
    | "annually";
  description?: string;
  currency?: string;
}

export interface CreateCustomerParams {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

class PaystackService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = PAYSTACK_SECRET_KEY;
    this.baseUrl = PAYSTACK_API_URL;
  }

  private async makeRequest(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: any,
  ) {
    try {
      const options: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json();

      return data;
    } catch (error) {
      console.error(`Paystack API Error (${endpoint}):`, error);
      throw error;
    }
  }

  async initializeSubscription(params: InitializeSubscriptionParams) {
    return await this.makeRequest("/transaction/initialize", "POST", {
      email: params.email,
      plan: params.planCode,
      amount: params.amount,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    });
  }

  /** One-time charge (no recurring plan) — used for org/seat invoices. */
  async initializeTransaction(params: {
    email: string;
    amount: number;
    callbackUrl: string;
    metadata?: Record<string, any>;
  }) {
    return await this.makeRequest("/transaction/initialize", "POST", {
      email: params.email,
      amount: params.amount,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    });
  }

  async verifyTransaction(
    reference: string,
  ): Promise<VerifyTransactionResponse> {
    return await this.makeRequest(`/transaction/verify/${reference}`);
  }

  async createPlan(params: CreatePlanParams) {
    return await this.makeRequest("/plan", "POST", {
      name: params.name,
      amount: params.amount,
      interval: params.interval,
      description: params.description,
      currency: params.currency || "NGN",
    });
  }

  async getPlans() {
    return await this.makeRequest("/plan");
  }

  async getPlan(planCode: string) {
    return await this.makeRequest(`/plan/${planCode}`);
  }

  async createCustomer(params: CreateCustomerParams) {
    return await this.makeRequest("/customer", "POST", params);
  }

  async getCustomer(emailOrCode: string) {
    return await this.makeRequest(`/customer/${emailOrCode}`);
  }

  async disableSubscription(subscriptionCode: string, emailToken: string) {
    return await this.makeRequest("/subscription/disable", "POST", {
      code: subscriptionCode,
      token: emailToken,
    });
  }

  async enableSubscription(subscriptionCode: string, emailToken: string) {
    return await this.makeRequest("/subscription/enable", "POST", {
      code: subscriptionCode,
      token: emailToken,
    });
  }

  async getSubscription(subscriptionCode: string) {
    return await this.makeRequest(`/subscription/${subscriptionCode}`);
  }

  async listSubscriptions(page = 1, perPage = 50) {
    return await this.makeRequest(
      `/subscription?page=${page}&perPage=${perPage}`,
    );
  }

  async getSubscriptionManageLink(subscriptionCode: string): Promise<string> {
    const response = await this.makeRequest(
      `/subscription/${subscriptionCode}/manage/link`,
      "GET",
    );
    if (!response?.status || !response.data?.link) {
      throw new Error(
        `Paystack manage link failed: ${response?.message ?? "no link returned"}`,
      );
    }
    return response.data.link;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return verifyPaystackSignature(payload, signature, this.apiKey);
  }

  /**
   * The customer's Paystack subscriptions (fetch-customer includes them).
   * Used to find the real SUB_ code + email token for a subscription we
   * only know by a charge_<ref> placeholder, so cancel can disable it.
   */
  async getCustomerSubscriptions(customerCode: string): Promise<
    Array<{
      subscription_code: string;
      email_token?: string;
      status: string;
    }>
  > {
    const res = await this.getCustomer(customerCode);
    if (!res?.status) {
      throw new Error(
        `Paystack customer lookup failed: ${res?.message ?? "unknown error"}`,
      );
    }
    return Array.isArray(res.data?.subscriptions) ? res.data.subscriptions : [];
  }

  koboToNaira(kobo: number): number {
    return kobo / 100;
  }

  nairaToKobo(naira: number): number {
    return Math.round(naira * 100);
  }

  formatAmount(kobo: number): string {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(this.koboToNaira(kobo));
  }
}

export const paystackService = new PaystackService();
