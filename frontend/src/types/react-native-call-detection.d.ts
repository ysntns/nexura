declare module 'react-native-call-detection' {
  export default class CallDetectorManager {
    constructor(
      callback: (event: string, phoneNumber: string) => void,
      readPhoneNumber: boolean,
      successCallback?: () => void,
      errorCallback?: (error: any) => void
    );

    dispose(): void;
  }
}
