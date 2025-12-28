import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('ポモドーロタイマーのタイトルが表示される', () => {
    render(<App />);
    expect(screen.getByText('ポモドーロタイマー')).toBeInTheDocument();
  });

  it('タイマーの初期表示が25:00である', () => {
    render(<App />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });

  it('開始ボタンが表示される', () => {
    render(<App />);
    expect(screen.getByText('開始')).toBeInTheDocument();
  });

  it('一時停止ボタンが表示される', () => {
    render(<App />);
    expect(screen.getByText('一時停止')).toBeInTheDocument();
  });

  it('リセットボタンが表示される', () => {
    render(<App />);
    expect(screen.getByText('リセット')).toBeInTheDocument();
  });

  it('完了セッション数が0で表示される', () => {
    render(<App />);
    expect(screen.getByText('完了セッション: 0')).toBeInTheDocument();
  });
});
