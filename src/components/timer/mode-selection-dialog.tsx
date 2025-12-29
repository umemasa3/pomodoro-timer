import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  ClockIcon,
  ListBulletIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTimerStore } from '../../stores/timer-store';

interface ModeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModeSelectionDialog: React.FC<ModeSelectionDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { setMode, setShowTaskSelection, startTimer } = useTimerStore();

  const handleTaskBasedMode = () => {
    setMode('task-based');
    onClose();
    setShowTaskSelection(true);
  };

  const handleStandaloneMode = async () => {
    setMode('standalone');
    onClose();
    await startTimer();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    セッションモードを選択
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    data-testid="close-mode-selection"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                    ポモドーロセッションをどのように開始しますか？
                  </p>

                  {/* タスクベースモード */}
                  <button
                    onClick={handleTaskBasedMode}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
                    data-testid="task-based-mode-button"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <ListBulletIcon className="h-6 w-6 text-blue-500 group-hover:text-blue-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                          タスクと一緒に開始
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          特定のタスクを選択してポモドーロセッションを開始します。
                          進捗の追跡と統計に反映されます。
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* スタンドアロンモード */}
                  <button
                    onClick={handleStandaloneMode}
                    className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400 transition-colors group"
                    data-testid="standalone-mode-button"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <ClockIcon className="h-6 w-6 text-green-500 group-hover:text-green-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                          集中時間として開始
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          特定のタスクに紐づけずに集中時間として開始します。
                          後からタスクを関連付けることも可能です。
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    セッション中にいつでもタスクを関連付けることができます
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
