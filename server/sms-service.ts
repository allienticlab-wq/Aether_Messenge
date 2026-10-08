import { SmsConfig } from '../src/types/index.js';

export interface SmsSendResult {
  success: boolean;
  messageId: string;
  provider: string;
  error?: string;
}

export class SmsProviderService {
  private config: SmsConfig;
  private recentDispatches: Map<string, number[]> = new Map();

  constructor(initialConfig: SmsConfig) {
    this.config = initialConfig;
  }

  public updateConfig(newConfig: Partial<SmsConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): SmsConfig {
    return { ...this.config };
  }

  public checkRateLimit(phoneNumber: string): boolean {
    const now = Date.now();
    const timestamps = this.recentDispatches.get(phoneNumber) || [];
    // Filter timestamps within last 60 seconds
    const activeTimestamps = timestamps.filter(ts => now - ts < 60000);
    this.recentDispatches.set(phoneNumber, activeTimestamps);

    if (activeTimestamps.length >= this.config.rateLimitPerMinute) {
      return false;
    }
    return true;
  }

  public async sendOtp(phoneNumber: string, otpCode: string, brandName: string): Promise<SmsSendResult> {
    const body = `Your ${brandName} verification code is: ${otpCode}. Valid for ${Math.round(this.config.otpExpirationSeconds / 60)} minutes. Do not share.`;
    return this.sendSms(phoneNumber, body);
  }

  public async sendSms(phoneNumber: string, body: string): Promise<SmsSendResult> {
    if (!this.checkRateLimit(phoneNumber)) {
      return {
        success: false,
        messageId: '',
        provider: this.config.provider,
        error: `Rate limit exceeded. Maximum ${this.config.rateLimitPerMinute} SMS per minute to this number.`
      };
    }

    const timestamps = this.recentDispatches.get(phoneNumber) || [];
    timestamps.push(Date.now());
    this.recentDispatches.set(phoneNumber, timestamps);

    const messageId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Provider dispatch abstraction
    switch (this.config.provider) {
      case 'twilio':
      case 'messagebird':
      case 'aws_sns':
      case 'infobip':
      case 'webhook':
      case 'simulator':
      default:
        // Returns simulated delivery with complete provider routing info
        return {
          success: true,
          messageId,
          provider: this.config.provider
        };
    }
  }
}
