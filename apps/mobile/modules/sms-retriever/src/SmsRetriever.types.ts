export type SmsRetrieverModuleEvents = {
  onSmsReceived: (params: { message: string }) => void;
  onTimeout: () => void;
};
