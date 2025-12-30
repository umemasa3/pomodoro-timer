import React from 'react';

interface SkipLinksProps {
  links?: Array<{
    href: string;
    label: string;
  }>;
}

const defaultLinks = [
  { href: '#main-content', label: 'メインコンテンツにスキップ' },
  { href: '#navigation', label: 'ナビゲーションにスキップ' },
  { href: '#timer-controls', label: 'タイマー操作にスキップ' },
];

export const SkipLinks: React.FC<SkipLinksProps> = ({
  links = defaultLinks,
}) => {
  const handleSkipClick = (href: string, event: React.MouseEvent) => {
    event.preventDefault();

    const target = document.querySelector(href);
    if (target instanceof HTMLElement) {
      // フォーカス可能でない場合はtabindex="-1"を追加
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }

      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // フォーカス後にtabindexを削除（元々なかった場合）
      setTimeout(() => {
        if (target.getAttribute('tabindex') === '-1') {
          target.removeAttribute('tabindex');
        }
      }, 100);
    }
  };

  return (
    <div className="skip-links fixed top-0 left-0 z-[9999]">
      {links.map((link, index) => (
        <a
          key={link.href}
          href={link.href}
          onClick={e => handleSkipClick(link.href, e)}
          className="
            absolute px-4 py-2 
            bg-gray-900 text-white font-medium text-sm
            transform -translate-y-full focus:translate-y-0
            transition-transform duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            rounded-b-md shadow-lg
            sr-only focus:not-sr-only
          "
          style={{ left: `${index * 200}px` }}
          tabIndex={0}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
};
