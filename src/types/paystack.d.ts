declare module 'react-native-paystack-webview' {
  import { Component } from 'react';

  interface PaystackWebViewProps {
    paystackKey: string;
    amount: number;
    billingEmail: string;
    billingName: string;
    billingMobile?: string;
    activityIndicatorColor?: string;
    onSuccess: (response: any) => void;
    onCancel: () => void;
    onError?: (error: any) => void;
    reference: string;
    autoStart?: boolean;
    channels?: string[];
    currency?: string;
    description?: string;
    buttonText?: string;
    showPayButton?: boolean;
  }

  export default class PaystackWebView extends Component<PaystackWebViewProps> {}
}
