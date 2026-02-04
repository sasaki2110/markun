import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/app/lib/utils';
import { moveDocument, checkCircularReference, getDocumentById } from '@/app/lib/documents';
import { z } from 'zod';

const moveDocumentSchema = z.object({
  parent_id: z.string().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = moveDocumentSchema.parse(body);

    // ドキュメントの存在確認
    const document = await getDocumentById(id, userId);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 移動先が同じ場合は何もしない
    if (document.parent_id === validatedData.parent_id) {
      return NextResponse.json(document);
    }

    // 循環参照チェック
    const hasCircularRef = await checkCircularReference(userId, id, validatedData.parent_id);
    if (hasCircularRef) {
      return NextResponse.json(
        { error: 'Cannot move: circular reference detected' },
        { status: 400 }
      );
    }

    // 移動実行
    const result = await moveDocument(id, userId, validatedData.parent_id);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to move document' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error moving document:', error);
    return NextResponse.json(
      { error: 'Failed to move document' },
      { status: 500 }
    );
  }
}