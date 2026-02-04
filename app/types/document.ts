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

// 後方互換性のためのエイリアス
export type MarkdownDocument = FileDocument;

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

