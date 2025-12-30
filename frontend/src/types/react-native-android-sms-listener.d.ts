declare module 'react-native-android-sms-listener' {
  export interface SMSMessage {
    originatingAddress: string;
    body: string;
    timestamp: number;
  }

  export interface Subscription {
    remove(): void;
  }

  export default class SmsListener {
    static addListener(callback: (message: SMSMessage) => void): Subscription;
  }
}
