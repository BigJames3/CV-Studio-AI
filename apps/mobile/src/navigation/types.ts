export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type HomeStackParamList = {
  Dashboard: undefined;
  CvList: undefined;
};

export type EditorStackParamList = {
  EditorHome: { cvId: string };
  SectionEdit: { cvId: string; section: string };
  AtsResult: { cvId: string; jobId?: string };
  ExportStatus: { cvId: string; jobId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  Editor: { cvId: string } | undefined;
  Paywall: { reason?: string } | undefined;
  CheckoutResult: { status: 'success' | 'cancel' };
};

export type MainTabParamList = {
  HomeTab: undefined;
  TemplatesTab: undefined;
  AITab: undefined;
  AccountTab: undefined;
};
