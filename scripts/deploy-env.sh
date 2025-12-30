#!/bin/bash

# Vercel環境変数デプロイスクリプト
# 使用方法: ./scripts/deploy-env.sh [production|staging|preview]

set -e

ENVIRONMENT=${1:-preview}
PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")

echo "🚀 Vercel環境変数デプロイ: $ENVIRONMENT"

# Vercel CLIの存在確認
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLIがインストールされていません"
  echo "インストール: npm i -g vercel"
  exit 1
fi

cd "$PROJECT_ROOT"

# 環境に応じた設定
case $ENVIRONMENT in
  "production")
    ENV_FILE=".env.production"
    TARGET="production"
    ;;
  "staging")
    ENV_FILE=".env.staging"
    TARGET="preview"
    ;;
  "preview")
    ENV_FILE=".env.local"
    TARGET="preview"
    ;;
  *)
    echo "❌ 無効な環境: $ENVIRONMENT"
    echo "使用可能な環境: production, staging, preview"
    exit 1
    ;;
esac

# 環境ファイルの存在確認
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ 環境ファイルが見つかりません: $ENV_FILE"
  echo "先に ./scripts/setup-env.sh $ENVIRONMENT を実行してください"
  exit 1
fi

echo "📁 環境ファイル: $ENV_FILE"
echo "🎯 デプロイ先: $TARGET"

# 環境変数をVercelに設定
echo "🔧 環境変数を設定中..."

# .envファイルから環境変数を読み込んでVercelに設定
while IFS= read -r line || [ -n "$line" ]; do
  # コメント行と空行をスキップ
  if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
    continue
  fi
  
  # 環境変数の形式をチェック
  if [[ $line =~ ^[A-Z_][A-Z0-9_]*= ]]; then
    # 変数名と値を分離
    var_name=$(echo "$line" | cut -d'=' -f1)
    var_value=$(echo "$line" | cut -d'=' -f2-)
    
    # 値が設定されているかチェック
    if [[ -n "$var_value" && "$var_value" != "your-"* && "$var_value" != "G-XXXXXXXXXX" ]]; then
      echo "  設定中: $var_name"
      
      # Vercelに環境変数を設定
      if vercel env add "$var_name" "$TARGET" < <(echo "$var_value") --yes > /dev/null 2>&1; then
        echo "    ✅ 設定完了"
      else
        echo "    ⚠️  既存の値を更新中..."
        vercel env rm "$var_name" "$TARGET" --yes > /dev/null 2>&1 || true
        vercel env add "$var_name" "$TARGET" < <(echo "$var_value") --yes > /dev/null 2>&1
        echo "    ✅ 更新完了"
      fi
    else
      echo "  ⏭️  スキップ: $var_name (値が未設定またはプレースホルダー)"
    fi
  fi
done < "$ENV_FILE"

echo ""
echo "✅ 環境変数のデプロイが完了しました"
echo ""
echo "📋 設定された環境変数を確認:"
vercel env ls

echo ""
echo "🔗 Vercelダッシュボード:"
echo "https://vercel.com/dashboard"
echo ""
echo "💡 ヒント:"
echo "- 機密情報（API キー等）は手動でVercelダッシュボードから設定することを推奨"
echo "- 環境変数の変更後は再デプロイが必要"