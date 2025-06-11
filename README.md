# GPT-Image-1 テスト環境

OpenAI の GPT-Image-1 モデルを使用した画像生成・編集アプリケーションです。

## 機能

- 🎨 **画像生成**: テキストプロンプトから新しい画像を生成
- ✏️ **画像編集**: 既存の画像をアップロードしてプロンプトで編集
- 📐 **サイズ選択**: 3つのサイズから選択可能
  - Square (1024x1024) - 正方形
  - Portrait (1024x1536) - 縦長
  - Landscape (1536x1024) - 横長
- ⚙️ **品質設定**: Low, Medium, High から選択可能
- 🔒 **セキュア**: API キーはクライアントサイドで管理

## 技術スタック

- **フロントエンド**: Nuxt 3 + Vue 3
- **UI**: Nuxt UI (Tailwind CSS ベース)
- **バックエンド**: Nuxt Server API
- **AI**: OpenAI GPT-Image-1 API

## セットアップ

### 前提条件

- Node.js 18+ 
- OpenAI API キー（GPT-Image-1 へのアクセス権限が必要）

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/gpt-image-inspection.git
cd gpt-image-inspection

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### 使用方法

1. ブラウザで `http://localhost:3000` にアクセス
2. OpenAI API キーを入力
3. **画像生成の場合**:
   - プロンプトを入力して「画像を生成」をクリック
4. **画像編集の場合**:
   - 画像をアップロード
   - 編集内容をプロンプトで指定して「画像を編集」をクリック

## API エンドポイント

### POST `/api/analyze-image`

画像の生成または編集を行います。

**リクエストボディ:**
```json
{
  "apiKey": "your-openai-api-key",
  "prompt": "生成・編集したい内容",
  "size": "small|medium|large",
  "quality": "low|medium|high",
  "imageBase64": "base64-encoded-image-data" // 編集時のみ
}
```

**レスポンス:**
```json
{
  "success": true,
  "imageData": "data:image/png;base64,...",
  "selectedSize": "1024x1024",
  "originalPrompt": "プロンプト"
}
```

## 注意事項

- GPT-Image-1 は限定アクセスのモデルです。使用には OpenAI からの承認が必要です
- API キーは安全に管理してください
- 生成される画像は OpenAI の利用規約に従います

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。
# gpt-image-inspection
