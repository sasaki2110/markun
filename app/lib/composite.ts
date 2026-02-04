import { Document, DocumentTreeNode } from '../types/document';

// 共通インターフェース
export interface DocumentNode {
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
export class FileNode implements DocumentNode {
  public readonly type = 'file' as const;

  constructor(
    public id: string,
    public user_id: string,
    public title: string,
    public content: string,
    public parent_id: string | null,
    public created_at: string,
    public updated_at: string
  ) {}
}

export class FolderNode implements DocumentNode {
  public readonly type = 'folder' as const;
  public children: DocumentNode[] = [];

  constructor(
    public id: string,
    public user_id: string,
    public title: string,
    public parent_id: string | null,
    public created_at: string,
    public updated_at: string
  ) {}

  addChild(child: DocumentNode): void {
    this.children.push(child);
  }

  removeChild(childId: string): void {
    this.children = this.children.filter(child => child.id !== childId);
  }

  getChild(childId: string): DocumentNode | undefined {
    return this.children.find(child => child.id === childId);
  }

  hasChildren(): boolean {
    return this.children.length > 0;
  }
}

// ツリービルダークラス
export class DocumentTreeBuilder {
  static buildTree(nodes: Document[]): FolderNode {
    const nodeMap = new Map<string, DocumentNode>();
    const root = new FolderNode('root', '', 'Root', null, '', '');

    // ノードをコンポジットオブジェクトに変換してマップに格納
    nodes.forEach(node => {
      let compositeNode: DocumentNode;

      if (node.type === 'file') {
        compositeNode = new FileNode(
          node.id,
          node.user_id,
          node.title,
          node.content,
          node.parent_id,
          node.created_at,
          node.updated_at
        );
      } else {
        compositeNode = new FolderNode(
          node.id,
          node.user_id,
          node.title,
          node.parent_id,
          node.created_at,
          node.updated_at
        );
      }

      nodeMap.set(node.id, compositeNode);
    });

    // 親子関係を構築
    nodes.forEach(node => {
      const compositeNode = nodeMap.get(node.id)!;

      if (node.parent_id) {
        const parent = nodeMap.get(node.parent_id);
        if (parent && parent.type === 'folder') {
          (parent as FolderNode).addChild(compositeNode);
        }
      } else {
        root.addChild(compositeNode);
      }
    });

    return root;
  }

  // 特定のユーザーのツリーを構築
  static buildUserTree(nodes: Document[], userId: string): FolderNode {
    const userNodes = nodes.filter(node => node.user_id === userId);
    return this.buildTree(userNodes);
  }

  // ツリーをフラットな配列に変換（DB保存用）
  static flattenTree(node: DocumentNode): Document[] {
    const result: Document[] = [];

    if (node.type === 'file') {
      result.push({
        id: node.id,
        user_id: node.user_id,
        title: node.title,
        type: 'file',
        content: (node as FileNode).content,
        parent_id: node.parent_id,
        created_at: node.created_at,
        updated_at: node.updated_at,
      });
    } else {
      result.push({
        id: node.id,
        user_id: node.user_id,
        title: node.title,
        type: 'folder',
        parent_id: node.parent_id,
        created_at: node.created_at,
        updated_at: node.updated_at,
      });

      // 子ノードを再帰的に処理
      const folderNode = node as FolderNode;
      folderNode.children.forEach(child => {
        result.push(...this.flattenTree(child));
      });
    }

    return result;
  }
}

// ツリー操作ユーティリティ
export class DocumentTreeUtils {
  // ノードを検索
  static findNode(tree: FolderNode, nodeId: string): DocumentNode | null {
    // ルートの子ノードを検索
    for (const child of tree.children) {
      const found = this.findNodeRecursive(child, nodeId);
      if (found) return found;
    }
    return null;
  }

  private static findNodeRecursive(node: DocumentNode, nodeId: string): DocumentNode | null {
    if (node.id === nodeId) return node;

    if (node.type === 'folder') {
      for (const child of (node as FolderNode).children) {
        const found = this.findNodeRecursive(child, nodeId);
        if (found) return found;
      }
    }

    return null;
  }

  // パスを取得（例: "フォルダA/フォルダB/ファイル.txt"）
  static getNodePath(tree: FolderNode, nodeId: string): string | null {
    const path: string[] = [];
    const found = this.buildPathRecursive(tree, nodeId, path);
    return found ? path.reverse().join('/') : null;
  }

  private static buildPathRecursive(node: DocumentNode, targetId: string, path: string[]): boolean {
    if (node.id === targetId) {
      path.push(node.title);
      return true;
    }

    if (node.type === 'folder') {
      for (const child of (node as FolderNode).children) {
        if (this.buildPathRecursive(child, targetId, path)) {
          path.push(node.title);
          return true;
        }
      }
    }

    return false;
  }

  // 循環参照をチェック
  static hasCircularReference(tree: FolderNode, nodeId: string, newParentId: string | null): boolean {
    if (!newParentId || nodeId === newParentId) return false;

    // newParentIdがnodeIdの子孫かどうかをチェック
    const node = this.findNode(tree, nodeId);
    if (!node) return false;

    return this.isDescendant(node, newParentId);
  }

  private static isDescendant(node: DocumentNode, targetId: string): boolean {
    if (node.type !== 'folder') return false;

    const folderNode = node as FolderNode;
    for (const child of folderNode.children) {
      if (child.id === targetId) return true;
      if (this.isDescendant(child, targetId)) return true;
    }

    return false;
  }
}