# プロパティベーステスト環境

このディレクトリには、ポモドーロタイマーアプリケーションのプロパティベーステスト（PBT）環境が含まれています。

## 概要

プロパティベーステストは、従来のユニットテストとは異なり、大量のランダムなテストデータを生成して、システムが満たすべき普遍的な性質（プロパティ）を検証するテスト手法です。

## ファイル構成

```
src/test/
├── README.md                    # このファイル
├── setup.ts                     # 基本テストセットアップ
├── property-test-setup.ts       # プロパティテスト専用設定とヘルパー
└── sample.property.test.ts      # サンプルプロパティテスト
```

## 使用技術

- **fast-check**: JavaScript/TypeScript用プロパティベーステストライブラリ
- **Vitest**: テストランナー（プロパティテスト専用設定）
- **カスタムアービトラリ**: アプリケーション固有のテストデータ生成器

## 実行方法

### プロパティテストのみ実行

```bash
pnpm run test:property
```

### プロパティテストをウォッチモードで実行

```bash
pnpm run test:property:watch
```

### 全てのテスト（ユニット + プロパティ）を実行

```bash
pnpm run test:all
```

## プロパティテストの設定

### 基本設定（property-test-setup.ts）

```typescript
export const propertyTestConfig = {
  numRuns: 100, // 最小実行回数
  timeout: 5000, // タイムアウト設定（5秒）
  seed: Math.random(), // 再現可能性のためのシード
  verbose: true, // 詳細なログ出力
};
```

### カスタムアービトラリ

アプリケーション固有のデータ型用のテストデータ生成器：

- `userSettingsArbitrary`: ユーザー設定データ
- `taskArbitrary`: タスクデータ
- `tagArbitrary`: タグデータ
- `sessionArbitrary`: セッションデータ
- `timerStateArbitrary`: タイマー状態データ

### ヘルパー関数

- `timeHelpers`: 時間関連の変換・検証
- `validationHelpers`: データ形式の検証
- `consistencyHelpers`: データ一貫性のチェック
- `propertyMatchers`: カスタムマッチャー
- `errorTestHelpers`: エラー処理テスト用

## プロパティテストの書き方

### 基本的なプロパティテスト

```typescript
import * as fc from 'fast-check';
import { taskArbitrary } from './property-test-setup';

test('プロパティ: タスクの基本的な一貫性', () => {
  fc.assert(
    fc.property(taskArbitrary, task => {
      // プロパティ：任意のタスクに対して成り立つべき性質
      return (
        task.title.length > 0 &&
        task.estimated_pomodoros >= 1 &&
        task.completed_pomodoros >= 0 &&
        task.completed_pomodoros <= task.estimated_pomodoros
      );
    }),
    { numRuns: 100 }
  );
});
```

### 設計文書のプロパティ実装

設計文書で定義された正確性プロパティを実装する際は、以下の形式に従ってください：

```typescript
test('プロパティ N: [プロパティ名]', () => {
  // **Feature: pomodoro-timer, Property N: [プロパティ名]**
  // **検証対象: 要件 X.Y**

  fc.assert(
    fc.property([アービトラリ], ([パラメータ]) => {
      // 実際の実装関数を呼び出し
      const result = actualImplementationFunction([パラメータ]);

      // プロパティの検証
      return [検証条件];
    }),
    { numRuns: 100 }
  );
});
```

## 設計文書のプロパティ一覧

現在実装予定の正確性プロパティ：

1. **プロパティ 1: タイマー開始の一貫性** - 要件 1.1
2. **プロパティ 2: セッション完了カウンターの増分** - 要件 3.1
3. **プロパティ 3: タスク状態更新の一貫性** - 要件 7.4
4. **プロパティ 4: データ変更の自動保存** - 要件 12.1

_完全なプロパティリスト（14項目）は設計文書を参照_

## テスト結果

プロパティテストの結果は以下に保存されます：

- **JSON形式**: `test-results/property-test-results.json`
- **コンソール出力**: 詳細なテスト実行ログ

## デバッグとトラブルシューティング

### プロパティテストが失敗した場合

1. **反例（Counterexample）を確認**: fast-checkが見つけた失敗例を分析
2. **シード値を記録**: 再現可能なテストのためにシード値を保存
3. **プロパティの見直し**: プロパティの定義が正しいか確認
4. **実装の修正**: 実装がプロパティを満たすように修正

### よくある問題

- **タイムアウト**: 複雑なプロパティは実行時間が長くなる場合があります
- **データ生成**: アービトラリが無効なデータを生成していないか確認
- **プロパティの定義**: プロパティが厳しすぎる、または緩すぎる場合があります

## ベストプラクティス

1. **小さなプロパティから始める**: 複雑なプロパティは段階的に構築
2. **エッジケースを考慮**: 境界値や特殊な条件を含める
3. **実装と並行して開発**: 実装とプロパティテストを同時に進める
4. **ドキュメント化**: プロパティの意図と検証内容を明確に記述
5. **継続的実行**: CI/CDパイプラインでプロパティテストを自動実行

## 参考資料

- [fast-check公式ドキュメント](https://fast-check.dev/)
- [プロパティベーステストの基礎](https://hypothesis.works/articles/what-is-property-based-testing/)
- [設計文書](../../../.kiro/specs/pomodoro-timer/design.md)
- [要件文書](../../../.kiro/specs/pomodoro-timer/requirements.md)
