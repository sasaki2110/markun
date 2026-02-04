# フォルダ・ファイル構成の実装プラン（コンポジットパターン）

## 概要

現在のマークダウンドキュメント管理システムはファイルの一覧機能のみで、ドキュメントが散乱しやすい構造となっています。コンポジットパターンを採用することで、フォルダとファイルを統一的に扱い、階層構造を実現します。

## コンポジットパターンの採用理由

- **統一的な操作**: フォルダとファイルを同じインターフェースで扱える
- **柔軟な階層構造**: フォルダ内にファイルやサブフォルダを無制限に配置可能
- **拡張性**: 新しいノードタイプ（例: リンク、ショートカット）の追加が容易
- **メモリ効率**: ツリー構造の効率的な表現

## データベース設計変更

### 現在のテーブル構造
```sql
CREATE TABLE markdown_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 新しいテーブル構造
```sql
CREATE TABLE markdown_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,  -- NULL許容（フォルダの場合はNULL）
  type VARCHAR(10) NOT NULL CHECK (type IN ('file', 'folder')),  -- ノードタイプ
  parent_id UUID REFERENCES markdown_documents(id) ON DELETE CASCADE,  -- 親ノード（NULL=ルート）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 既存のインデックスを維持
CREATE INDEX idx_markdown_documents_user_id ON markdown_documents(user_id);
CREATE INDEX idx_markdown_documents_created_at ON markdown_documents(created_at DESC);

-- 新しいインデックス追加
CREATE INDEX idx_markdown_documents_parent_id ON markdown_documents(parent_id);
CREATE INDEX idx_markdown_documents_user_type ON markdown_documents(user_id, type);
```

### DDL変更点の詳細

1. **typeカラム追加**: 'file'または'folder'を指定
2. **parent_id追加**: 自己参照外部キー（親ノードを示す）
3. **contentをNULL許容**: フォルダの場合はcontent不要
4. **ON DELETE CASCADE**: 親フォルダ削除時に子要素も自動削除
5. **新しいインデックス**: 親子関係とタイプ別の検索を効率化

### マイグレーションプラン

```sql
-- 既存データをバックアップ
CREATE TABLE markdown_documents_backup AS SELECT * FROM markdown_documents;

-- 新しいカラムを追加
ALTER TABLE markdown_documents ADD COLUMN type VARCHAR(10) DEFAULT 'file';
ALTER TABLE markdown_documents ADD COLUMN parent_id UUID REFERENCES markdown_documents(id) ON DELETE CASCADE;

-- contentをNULL許容に変更
ALTER TABLE markdown_documents ALTER COLUMN content DROP NOT NULL;

-- 既存データのtypeを'file'に設定
UPDATE markdown_documents SET type = 'file' WHERE type IS NULL;

-- typeをNOT NULLに変更
ALTER TABLE markdown_documents ALTER COLUMN type SET NOT NULL;

-- 新しいインデックス作成
CREATE INDEX idx_markdown_documents_parent_id ON markdown_documents(parent_id);
CREATE INDEX idx_markdown_documents_user_type ON markdown_documents(user_id, type);

-- 制約追加
ALTER TABLE markdown_documents ADD CONSTRAINT check_type CHECK (type IN ('file', 'folder'));
```

## コンポジットパターンの実装

### コンポーネント構造

```typescript
// 共通インターフェース
interface DocumentNode {
  id: string;
  user_id: string;
  title: string;
  type: 'file' | 'folder';
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  children?: DocumentNode[]; // フォルダの場合のみ
}

// コンポジットクラス
class FileNode implements DocumentNode {
  constructor(
    public id: string,
    public user_id: string,
    public title: string,
    public content: string,
    public parent_id: string | null,
    public created_at: string,
    public updated_at: string
  ) {}

  get type(): 'file' { return 'file'; }
}

class FolderNode implements DocumentNode {
  public children: DocumentNode[] = [];

  constructor(
    public id: string,
    public user_id: string,
    public title: string,
    public parent_id: string | null,
    public created_at: string,
    public updated_at: string
  ) {}

  get type(): 'folder' { return 'folder'; }

  addChild(child: DocumentNode): void {
    this.children.push(child);
  }

  removeChild(childId: string): void {
    this.children = this.children.filter(child => child.id !== childId);
  }
}

// ツリービルダークラス
class DocumentTreeBuilder {
  static buildTree(nodes: DocumentNode[]): FolderNode {
    const nodeMap = new Map<string, DocumentNode>();
    const root = new FolderNode('root', '', 'Root', null, '', '');

    // ノードをマップに格納
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    // 親子関係を構築
    nodes.forEach(node => {
      if (node.parent_id) {
        const parent = nodeMap.get(node.parent_id);
        if (parent && parent.type === 'folder') {
          (parent as FolderNode).addChild(node);
        }
      } else {
        root.addChild(node);
      }
    });

    return root;
  }
}
```

### TypeScript型定義の変更

```typescript
// app/types/document.ts
export type DocumentType = 'file' | 'folder';

export interface BaseDocument {
  id: string;
  user_id: string;
  title: string;
  type: DocumentType;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileDocument extends BaseDocument {
  type: 'file';
  content: string;
}

export interface FolderDocument extends BaseDocument {
  type: 'folder';
  content?: never; // フォルダにはcontentなし
}

export type Document = FileDocument | FolderDocument;

export interface CreateDocumentInput {
  title: string;
  content?: string; // ファイルの場合のみ必須
  type: DocumentType;
  parent_id?: string | null;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string; // ファイルの場合のみ
  parent_id?: string | null;
}

// ツリー構造用の型
export interface DocumentTreeNode extends BaseDocument {
  children?: DocumentTreeNode[];
}
```

## API設計変更

### 新しいAPIエンドポイント

```typescript
// GET /api/documents/tree - ツリー構造取得
// GET /api/documents?folderId=xxx - 特定のフォルダ内のアイテム取得
// POST /api/documents/folder - フォルダ作成
// PUT /api/documents/[id]/move - 移動操作
```

### APIレスポンス例

```typescript
// ツリー構造レスポンス
interface TreeResponse {
  id: string;
  title: string;
  type: 'file' | 'folder';
  parent_id: string | null;
  children?: TreeResponse[];
  created_at: string;
  updated_at: string;
}
```

## UI/UX設計

### ツリー表示コンポーネント

```tsx
// components/documents/DocumentTree.tsx
'use client';

interface TreeNodeProps {
  node: DocumentTreeNode;
  level: number;
  onSelect: (node: DocumentTreeNode) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateFile: (parentId: string | null) => void;
  onMove: (nodeId: string, newParentId: string | null) => void;
}

export function TreeNode({ node, level, ...handlers }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div style={{ paddingLeft: level * 20 }}>
      <div className="flex items-center">
        {node.type === 'folder' && (
          <button onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? '📁' : '📂'} {node.title}
          </button>
        )}
        {node.type === 'file' && (
          <button onClick={() => handlers.onSelect(node)}>
            📄 {node.title}
          </button>
        )}
        {/* コンテキストメニュー */}
        <ContextMenu>
          <ContextMenuItem onClick={() => handlers.onCreateFolder(node.id)}>
            新規フォルダ
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handlers.onCreateFile(node.id)}>
            新規ファイル
          </ContextMenuItem>
        </ContextMenu>
      </div>
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              {...handlers}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### ドラッグ&ドロップ機能

```tsx
// ドラッグ&ドロップによる移動機能
interface DragDropHandlers {
  onDragStart: (node: DocumentTreeNode) => void;
  onDragOver: (e: React.DragEvent, targetNode: DocumentTreeNode) => void;
  onDrop: (e: React.DragEvent, targetNode: DocumentTreeNode) => void;
}
```

## 実装手順

### Phase 1: データベースマイグレーション
1. [x] マイグレーションスクリプト作成
2. [x] 既存データのバックアップ
3. [x] 新しいカラム追加
4. [x] データ移行（type='file'設定）
5. [x] インデックス作成
6. [x] 制約追加

### Phase 2: 型定義とモデル変更
1. [x] TypeScript型定義更新
2. [x] コンポジットパターンクラス実装
3. [x] ツリービルダークラス実装
4. [x] データベース操作関数の更新

### Phase 3: API変更
1. [x] ツリー取得API実装
2. [x] フォルダ作成API実装
3. [x] 移動API実装
4. [x] 既存CRUD APIの更新

### Phase 4: UI変更
1. [x] ツリー表示コンポーネント実装
2. [x] ドラッグ&ドロップ機能実装
3. [x] コンテキストメニュー実装
4. [x] ナビゲーションバン更新

### Phase 5: テスト・移行
1. [ ] 既存データの確認
2. [ ] 新機能のテスト
3. [ ] パフォーマンステスト
4. [ ] UI/UXテスト

## 考慮事項

### セキュリティ
- 親子関係の循環参照防止
- ユーザーの権限チェック（自分のドキュメントのみ操作可能）
- フォルダ削除時の子要素保護

### パフォーマンス
- 大規模ツリーの遅延読み込み
- ツリー構造のキャッシュ戦略
- データベースクエリの最適化

### UX
- フォルダの展開/折りたたみ状態の保存
- ドラッグ&ドロップの視覚フィードバック
- 移動操作のUndo機能

### 拡張性
- ノードタイプの追加（リンク、ショートカットなど）
- 共有機能の検討
- タグ付け機能の統合

## まとめ

コンポジットパターンの採用により、フォルダ・ファイル構成を実現できます。DB変更は最小限に抑え、既存の機能を維持しつつ新しい階層構造を追加できます。この実装により、ドキュメントの整理性が大幅に向上し、より実用的で使いやすいシステムとなります。