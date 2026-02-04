import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/app/lib/utils';
import { getDocumentTree } from '@/app/lib/documents';
import { DocumentTreeBuilder } from '@/app/lib/composite';
import type { DocumentTreeNode } from '@/app/types/document';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーの全ドキュメントを取得
    const documents = await getDocumentTree(userId);

    // ツリー構造を構築
    const tree = DocumentTreeBuilder.buildUserTree(documents, userId);

    // ツリーをシリアライズ可能な形式に変換
    const serializeNode = (node: any): DocumentTreeNode => {
      const result: DocumentTreeNode = {
        id: node.id,
        user_id: node.user_id,
        title: node.title,
        type: node.type,
        parent_id: node.parent_id,
        created_at: node.created_at,
        updated_at: node.updated_at,
      };

      if (node.children && node.children.length > 0) {
        result.children = node.children.map(serializeNode);
      }

      return result;
    };

    const serializedTree = serializeNode(tree);

    return NextResponse.json(serializedTree);
  } catch (error) {
    console.error('Error fetching document tree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document tree' },
      { status: 500 }
    );
  }
}