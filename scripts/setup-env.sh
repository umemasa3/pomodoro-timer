#!/bin/bash

# 環境変数セットアップスクリプト
# 使用方法: ./scripts/setup-env.sh [production|staging|development]

set -e

ENVIRONMENT=${1:-development}
PROJECT_ROOT=$(dirname "$(dirname "$(realpath "$0")")")

echo "🔧 環境変数セットアップ: $ENVIRONMENT"

case $ENVIRONMENT in
  "production")
    ENV_FILE=".env.production"
    TEMPLATE_FILE=".env.production.example"
    ;;
  "staging")
    ENV_FILE=".env.staging"
    TEMPLATE_FILE=".env.staging.example"
    ;;
  "development")
    ENV_FILE=".env.local"
    TEMPLATE_FILE=".env.example"
    ;;
  *)
    echo "❌ 無効な環境: $ENVIRONMENT"
    echo "使用可能な環境: production, staging, development"
    exit 1
    ;;
esac

cd "$PROJECT_ROOT"

# テンプレートファイルの存在確認
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "❌ テンプレートファイルが見つかりません: $TEMPLATE_FILE"
  exit 1
fi

# 既存の環境ファイルの確認
if [ -f "$ENV_FILE" ]; then
  echo "⚠️  既存の環境ファイルが見つかりました: $ENV_FILE"
  read -p "上書きしますか？ (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ セットアップをキャンセルしました"
    exit 1
  fi
fi

# テンプレートファイルをコピー
cp "$TEMPLATE_FILE" "$ENV_FILE"
echo "✅ 環境ファイルを作成しました: $ENV_FILE"

# 環境固有の設定
case $ENVIRONMENT in
  "production")
    echo "🔒 本番環境の設定を適用中..."
    
    # セキュリティ設定を強化
    sed -i.bak 's/VITE_ENABLE_SOURCE_MAPS=true/VITE_ENABLE_SOURCE_MAPS=false/' "$ENV_FILE"
    sed -i.bak 's/VITE_DEBUG_MODE=true/VITE_DEBUG_MODE=false/' "$ENV_FILE"
    sed -i.bak 's/VITE_ENABLE_CONSOLE_LOGS=true/VITE_ENABLE_CONSOLE_LOGS=false/' "$ENV_FILE"
    
    # バックアップファイルを削除
    rm -f "${ENV_FILE}.bak"
    
    echo "⚠️  重要: 以下の値を実際の本番環境の値に更新してください:"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_ANON_KEY"
    echo "  - VITE_SENTRY_DSN"
    echo "  - VITE_VERCEL_ANALYTICS_ID"
    ;;
    
  "staging")
    echo "🧪 ステージング環境の設定を適用中..."
    
    echo "⚠️  重要: 以下の値を実際のステージング環境の値に更新してください:"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_ANON_KEY"
    echo "  - VITE_SENTRY_DSN"
    ;;
    
  "development")
    echo "🛠️  開発環境の設定を適用中..."
    
    echo "💡 ヒント: 開発用のSupabaseプロジェクトを作成し、以下の値を更新してください:"
    echo "  - VITE_SUPABASE_URL"
    echo "  - VITE_SUPABASE_ANON_KEY"
    ;;
esac

echo ""
echo "✅ 環境変数セットアップが完了しました"
echo "📝 環境ファイル: $ENV_FILE"
echo ""
echo "次のステップ:"
echo "1. $ENV_FILE を編集して実際の値を設定"
echo "2. 環境ファイルを .gitignore に追加されていることを確認"
echo "3. Vercelダッシュボードで環境変数を設定"