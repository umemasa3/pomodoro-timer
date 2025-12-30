export { OnboardingTour } from './onboarding-tour';
export {
  FeatureTooltip,
  TimerTooltip,
  TaskTooltip,
  StatisticsTooltip,
  TooltipManager,
} from './feature-tooltip';
export { SetupWizard } from './setup-wizard';
export { ProgressiveDisclosure } from './progressive-disclosure';

// オンボーディング管理用のフック
export { useOnboarding } from './use-onboarding';

// オンボーディング状態管理
export type OnboardingState = {
  hasCompletedSetup: boolean;
  hasSeenTour: boolean;
  currentStep: number;
  dismissedTooltips: string[];
};

// オンボーディング設定
export interface OnboardingConfig {
  showSetupWizard: boolean;
  showTour: boolean;
  showTooltips: boolean;
  autoStart: boolean;
  skipForReturningUsers: boolean;
}

export const defaultOnboardingConfig: OnboardingConfig = {
  showSetupWizard: true,
  showTour: true,
  showTooltips: true,
  autoStart: true,
  skipForReturningUsers: true,
};
