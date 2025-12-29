import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/auth-store';

export interface OnboardingState {
  hasCompletedSetup: boolean;
  hasSeenTour: boolean;
  currentStep: number;
  dismissedTooltips: string[];
  showSetupWizard: boolean;
  showTour: boolean;
}

export interface OnboardingActions {
  startSetup: () => void;
  completeSetup: () => void;
  startTour: () => void;
  completeTour: () => void;
  dismissTooltip: (tooltipId: string) => void;
  resetOnboarding: () => void;
  skipOnboarding: () => void;
}

const STORAGE_KEY = 'onboarding-state';

const getInitialState = (): OnboardingState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('オンボーディング状態の読み込みに失敗:', error);
  }

  return {
    hasCompletedSetup: false,
    hasSeenTour: false,
    currentStep: 0,
    dismissedTooltips: [],
    showSetupWizard: false,
    showTour: false,
  };
};

export const useOnboarding = (): OnboardingState & OnboardingActions => {
  const [state, setState] = useState<OnboardingState>(getInitialState);
  const { user, isAuthenticated } = useAuthStore();

  // 状態をローカルストレージに保存
  const saveState = useCallback((newState: OnboardingState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      setState(newState);
    } catch (error) {
      console.warn('オンボーディング状態の保存に失敗:', error);
      setState(newState);
    }
  }, []);

  // 新規ユーザーかどうかの判定
  const isNewUser = useCallback(() => {
    if (!user?.created_at) return true;
    
    const createdAt = new Date(user.created_at);
    const now = new Date();
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceCreation < 1; // 1日以内なら新規ユーザー
  }, [user]);

  // 認証状態変更時のオンボーディング開始判定
  useEffect(() => {
    if (isAuthenticated && user && isNewUser()) {
      const currentState = getInitialState();
      
      // 新規ユーザーで未完了の場合、セットアップウィザードを表示
      if (!currentState.hasCompletedSetup) {
        saveState({
          ...currentState,
          showSetupWizard: true,
        });
      }
      // セットアップ完了済みでツアー未完了の場合、ツアーを表示
      else if (!currentState.hasSeenTour) {
        saveState({
          ...currentState,
          showTour: true,
        });
      }
    }
  }, [isAuthenticated, user, isNewUser, saveState]);

  // アクション関数
  const startSetup = useCallback(() => {
    saveState({
      ...state,
      showSetupWizard: true,
    });
  }, [state, saveState]);

  const completeSetup = useCallback(() => {
    const newState = {
      ...state,
      hasCompletedSetup: true,
      showSetupWizard: false,
      showTour: true, // セットアップ完了後にツアーを開始
    };
    saveState(newState);
  }, [state, saveState]);

  const startTour = useCallback(() => {
    saveState({
      ...state,
      showTour: true,
      currentStep: 0,
    });
  }, [state, saveState]);

  const completeTour = useCallback(() => {
    saveState({
      ...state,
      hasSeenTour: true,
      showTour: false,
      currentStep: 0,
    });
  }, [state, saveState]);

  const dismissTooltip = useCallback((tooltipId: string) => {
    if (!state.dismissedTooltips.includes(tooltipId)) {
      saveState({
        ...state,
        dismissedTooltips: [...state.dismissedTooltips, tooltipId],
      });
    }
  }, [state, saveState]);

  const resetOnboarding = useCallback(() => {
    const resetState: OnboardingState = {
      hasCompletedSetup: false,
      hasSeenTour: false,
      currentStep: 0,
      dismissedTooltips: [],
      showSetupWizard: false,
      showTour: false,
    };
    saveState(resetState);
  }, [saveState]);

  const skipOnboarding = useCallback(() => {
    saveState({
      ...state,
      hasCompletedSetup: true,
      hasSeenTour: true,
      showSetupWizard: false,
      showTour: false,
    });
  }, [state, saveState]);

  return {
    ...state,
    startSetup,
    completeSetup,
    startTour,
    completeTour,
    dismissTooltip,
    resetOnboarding,
    skipOnboarding,
  };
};

// オンボーディング完了状態をチェックするヘルパー関数
export const useIsOnboardingComplete = (): boolean => {
  const { hasCompletedSetup, hasSeenTour } = useOnboarding();
  return hasCompletedSetup && hasSeenTour;
};

// 特定のツールチップが表示済みかチェックするヘルパー関数
export const useIsTooltipDismissed = (tooltipId: string): boolean => {
  const { dismissedTooltips } = useOnboarding();
  return dismissedTooltips.includes(tooltipId);
};