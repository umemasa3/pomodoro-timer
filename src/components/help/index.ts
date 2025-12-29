export { ContextualHelp } from './contextual-help';
export { FAQPage } from './faq-page';
export { FeedbackForm } from './feedback-form';
export { SupportChat } from './support-chat';

// ヘルプシステム統合コンポーネント
export { HelpCenter } from './help-center';

// ヘルプ関連の型定義
export interface HelpContextType {
  showContextualHelp: boolean;
  currentContext: string;
  openFAQ: () => void;
  openFeedback: () => void;
  openSupport: () => void;
}

// ヘルプシステムの設定
export interface HelpSystemConfig {
  enableContextualHelp: boolean;
  enableFAQ: boolean;
  enableFeedback: boolean;
  enableSupportChat: boolean;
  autoShowHelp: boolean;
  helpDelay: number;
}

export const defaultHelpConfig: HelpSystemConfig = {
  enableContextualHelp: true,
  enableFAQ: true,
  enableFeedback: true,
  enableSupportChat: true,
  autoShowHelp: true,
  helpDelay: 3000,
};