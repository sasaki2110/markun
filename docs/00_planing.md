# マークダウンビューワー 実装プラン

## プロジェクト概要

マークダウンファイルを管理・閲覧できるWebアプリケーション。**Streamdown**を使用してマークダウンをレンダリングし、将来的なAIストリーミング機能に最適化されています。Vercel AI SDKのストリーミング機能を活用し、将来的にはAIによる質問応答機能を実装予定。

### Streamdownの利点

- **AIストリーミング対応**: ストリーミング中の不完全なマークダウン構文も適切にレンダリング
- **CJK言語サポート**: 日本語、中国語、韓国語のテキストにおける強調表示が正しく機能
- **美しいコードブロック**: Shikiによるシンタックスハイライトと、コピー・ダウンロードボタンを備えたインタラクティブなコードブロック
- **セキュリティ強化**: 悪意のあるマークダウンコンテンツから保護するための組み込みのセキュリティ機能
- **GitHub Flavored Markdown**: テーブル、タスクリスト、打ち消し線などのGFM機能をサポート
- **react-markdown互換**: 既存のreact-markdownコードからの移行が容易

## 技術スタック

### フロントエンド・フレームワーク
- **Next.js 16.1.1** (App Router)
- **React 19.2.3**
- **TypeScript 5**
- **Tailwind CSS 4**

### バックエンド・データベース
- **Vercel Postgres** - データ永続化
- **Vercel AI SDK** - ストリーミング機能（将来的な拡張用）

### 認証
- **next-auth** - Credentials Provider（ユーザー名ベース）

### マークダウン処理
- **streamdown** - AIストリーミング対応のマークダウンレンダラー
  - react-markdownのドロップイン代替
  - 不完全なマークダウン構文の自動処理
  - AIストリーミング時のプログレッシブレンダリング
  - CJK言語サポート（日本語、中国語、韓国語）
  - Shikiによるシンタックスハイライト
  - GitHub Flavored Markdown対応
  - セキュリティ機能内蔵

## データベース設計

### markdown_documents テーブル
```sql
CREATE TABLE markdown_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_markdown_documents_user_id ON markdown_documents(user_id);
CREATE INDEX idx_markdown_documents_created_at ON markdown_documents(created_at DESC);
```

**注意**: このアプリケーションは個人利用のみを想定しています。`user_id`は`.env.local`で定義されたユーザー名を保存します。

## 認証設計

### 認証方式
- **個人利用のみ**: このアプリケーションは個人利用を想定しており、複数ユーザー管理は不要
- **認証情報の管理**: `.env.local`にユーザー名とパスワードを定義
- **認証ライブラリ**: next-auth (Credentials Provider)

### next-auth設定
- **Provider**: Credentials Provider
- **認証方式**: ユーザー名 + パスワード
- **認証情報の取得**: `.env.local`から`AUTH_USERNAME`と`AUTH_PASSWORD`を読み取り
- **セッション管理**: JWT
- **パスワード比較**: `.env.local`のパスワードと入力パスワードを比較（セキュリティのため、必要に応じてハッシュ化）

### 認証フロー
1. ユーザーがユーザー名とパスワードを入力
2. Credentials Providerが`.env.local`の認証情報と照合
3. 成功時、セッションを作成（ユーザー名をセッションに保存）
4. 保護されたルートへのアクセスを制御
5. ドキュメント作成・編集時は、セッションのユーザー名を`user_id`として保存

## 機能一覧

### 認証機能
- [ ] ログイン（ユーザー名 + パスワード）
- [ ] ログアウト
- [ ] セッション管理
- [ ] 保護されたルート

### CRUD機能
- [ ] **一覧表示** (`/documents`)
  - マークダウンドキュメントの一覧表示
  - タイトル、作成日時、更新日時を表示
  - ページネーション（オプション）
  - 検索・フィルタリング（オプション）

- [ ] **新規作成** (`/documents/new`)
  - マークダウンのエディタ（テキストエリアまたはリッチエディタ）
  - タイトル入力
  - プレビュー機能（オプション）
  - 保存ボタン

- [ ] **編集** (`/documents/[id]/edit`)
  - 既存ドキュメントの編集
  - タイトルとコンテンツの更新
  - 保存ボタン

- [ ] **閲覧** (`/documents/[id]`)
  - Streamdownを使用したマークダウンのレンダリング表示
  - タイトル表示
  - 編集・削除ボタン（オプション）
  - コードブロックのシンタックスハイライト（Shiki）
  - コピー・ダウンロード機能（コードブロック）

- [ ] **削除** (`/documents/[id]/delete`)
  - 削除確認ダイアログ
  - 削除実行
  - 削除後の一覧ページへのリダイレクト

### UI/UX機能
- [ ] レスポンシブデザイン
- [ ] ダークモード対応
- [ ] ローディング状態の表示
- [ ] エラーハンドリングとメッセージ表示

## ディレクトリ構造

```
markun/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (protected)/
│   │   ├── documents/
│   │   │   ├── page.tsx              # 一覧
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # 新規作成
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # 閲覧
│   │   │       ├── edit/
│   │   │       │   └── page.tsx      # 編集
│   │   │       └── delete/
│   │   │           └── page.tsx      # 削除
│   │   └── api/
│   │       └── documents/
│   │           ├── route.ts          # GET, POST
│   │           └── [id]/
│   │               └── route.ts      # GET, PUT, DELETE
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts          # next-auth設定
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginForm.tsx
│   │   ├── documents/
│   │   │   ├── DocumentList.tsx
│   │   │   ├── DocumentEditor.tsx
│   │   │   ├── DocumentViewer.tsx      # Streamdownコンポーネント使用
│   │   │   └── DeleteConfirmDialog.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── Loading.tsx
│   ├── lib/
│   │   ├── auth.ts                   # next-auth設定
│   │   ├── db.ts                     # Vercel Postgres接続
│   │   ├── utils.ts                  # ユーティリティ関数
│   │   └── validations.ts            # バリデーション
│   ├── types/
│   │   └── document.ts               # 型定義
│   └── layout.tsx
├── docs/
│   └── 00_planing.md
└── package.json
```

## 実装手順

### Phase 1: 環境設定
1. [ ] Vercel Postgresデータベースのセットアップ
2. [ ] 環境変数の設定（`.env.local`）
   - `POSTGRES_URL` - Vercel Postgres接続URL（例: `postgres://default:u----------------------------------------`）
   - `NEXTAUTH_SECRET` - セッション暗号化用の秘密鍵
   - `NEXTAUTH_URL` - アプリケーションのURL（例: `http://localhost:3000`）
   - `AUTH_USERNAME` - ログイン用のユーザー名
   - `AUTH_PASSWORD` - ログイン用のパスワード
3. [ ] 必要なパッケージのインストール
   - `@vercel/postgres`
   - `next-auth`
   - `streamdown` - マークダウンレンダリング（AIストリーミング対応）
   - `zod` (バリデーション用)
4. [ ] Tailwind CSS設定の更新
   - `globals.css`に`@source "../node_modules/streamdown/dist/*.js";`を追加

### Phase 2: 認証実装
1. [ ] next-authの設定ファイル作成
   - `.env.local`から`AUTH_USERNAME`と`AUTH_PASSWORD`を読み取る
2. [ ] Credentials Providerの実装
   - 入力されたユーザー名・パスワードと`.env.local`の値を比較
   - 認証成功時、ユーザー名をセッションに保存
3. [ ] ログインページの作成
4. [ ] セッション管理の実装
5. [ ] ミドルウェアでルート保護
6. [ ] セッションからユーザー名を取得するユーティリティ関数の作成

### Phase 3: データベース接続
1. [ ] Vercel Postgres接続の設定
2. [ ] テーブル作成（マイグレーション）
   - `markdown_documents`テーブルのみ作成（`users`テーブルは不要）
   - `user_id`は`VARCHAR(255)`型
3. [ ] データベース操作のユーティリティ関数作成
   - セッションから取得したユーザー名を`user_id`として使用

### Phase 4: CRUD機能実装
1. [ ] API Routesの実装
   - GET `/api/documents` - 一覧取得（セッションのユーザー名でフィルタリング）
   - POST `/api/documents` - 新規作成（セッションのユーザー名を`user_id`として保存）
   - GET `/api/documents/[id]` - 単一取得（ユーザー名で権限チェック）
   - PUT `/api/documents/[id]` - 更新（ユーザー名で権限チェック）
   - DELETE `/api/documents/[id]` - 削除（ユーザー名で権限チェック）
2. [ ] 一覧ページの実装
3. [ ] 新規作成ページの実装
4. [ ] 閲覧ページの実装
5. [ ] 編集ページの実装
6. [ ] 削除機能の実装

### Phase 5: UI/UX改善
1. [ ] Streamdownコンポーネントの実装
   - DocumentViewerコンポーネントでStreamdownを使用
   - 基本的なマークダウンレンダリング
   - コードブロックのシンタックスハイライト（Shiki自動対応）
2. [ ] エディタの改善（シンタックスハイライト等）
3. [ ] ローディング状態の実装
4. [ ] エラーハンドリングの実装
5. [ ] レスポンシブデザインの調整

### Phase 6: テスト・デバッグ
1. [ ] 各機能の動作確認
2. [ ] エッジケースのテスト
3. [ ] パフォーマンスの最適化

## 将来の拡張機能

### AI質問応答機能
- **Vercel AI SDK**のストリーミング機能を利用
- マークダウンドキュメントの内容についてAIに質問
- **Streamdown**を使用してストリーミングレスポンスを表示
  - `isAnimating`プロップでストリーミング中のアニメーション制御
  - 不完全なマークダウン構文の自動処理
  - プログレッシブレンダリング

#### 実装イメージ
```
/documents/[id]/ask
- 質問入力フォーム
- AIストリーミングレスポンスの表示（Streamdown使用）
- 会話履歴の保存（オプション）
```

#### 実装例
```tsx
'use client';
import { useChat } from '@ai-sdk/react';
import { Streamdown } from 'streamdown';

export default function AskPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  
  return (
    <div>
      {messages.map((message) => (
        <Streamdown key={message.id} isAnimating={isLoading && message.role === 'assistant'}>
          {message.content}
        </Streamdown>
      ))}
      {/* フォーム */}
    </div>
  );
}
```

#### 必要な追加実装
- AI SDKの設定
- ストリーミングAPIエンドポイント
- プロンプトエンジニアリング
- コンテキスト管理（ドキュメント内容の要約・抽出）
- Streamdownの`isAnimating`プロップを使用したストリーミング状態管理

## 環境変数

```env
# データベース
POSTGRES_URL=postgres://default:u----------------------------------------

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# 認証情報（個人利用のみ）
AUTH_USERNAME=your-username
AUTH_PASSWORD=your-password

# AI SDK (将来の拡張用)
OPENAI_API_KEY=sk-... (または他のAIプロバイダー)
```

**注意**: `.env.local`はGitにコミットしないでください。`.gitignore`に追加されていることを確認してください。

## 依存関係（追加予定）

```json
{
  "dependencies": {
    "@vercel/postgres": "^0.x.x",
    "next-auth": "^5.x.x",
    "streamdown": "^1.x.x",
    "zod": "^3.x.x",
    "@ai-sdk/openai": "^1.x.x",
    "@ai-sdk/react": "^1.x.x"
  }
}
```

**注意**: 個人利用のみのため、`bcryptjs`は不要です。`.env.local`のパスワードと直接比較します（セキュリティ要件に応じて、必要に応じて追加可能）。

## 注意事項

1. **セキュリティ**
   - `.env.local`はGitにコミットしない（`.gitignore`に追加）
   - SQLインジェクション対策（パラメータ化クエリ）
   - XSS対策（Streamdownに内蔵されたセキュリティ機能を活用）
   - 認証情報は環境変数で管理（本番環境ではVercelの環境変数設定を使用）
   - 必要に応じて、パスワードのハッシュ化を検討（個人利用のため、現時点では平文比較でも可）

2. **パフォーマンス**
   - 大量のドキュメントがある場合のページネーション
   - インデックスの適切な設定

3. **ユーザビリティ**
   - 自動保存機能（オプション）
   - 編集中の警告（未保存の変更）

## 参考リソース

- [Next.js Documentation](https://nextjs.org/docs)
- [next-auth Documentation](https://next-auth.js.org/)
- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Streamdown Documentation](https://streamdown.ai/docs)
  - [Getting Started](https://streamdown.ai/docs/getting-started)
  - [Usage](https://streamdown.ai/docs/usage)
  - [Configuration](https://streamdown.ai/docs/configuration)
  - [Styling](https://streamdown.ai/docs/styling)

