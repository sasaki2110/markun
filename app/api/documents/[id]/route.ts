import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/app/lib/utils';
import { getDocumentById, updateDocument, deleteDocument, moveDocument, checkCircularReference, validateUpdateDocumentInput } from '@/app/lib/documents';
import { z } from 'zod';
import type { Document, UpdateDocumentInput } from '@/app/types/document';

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  parent_id: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const document = await getDocumentById(id, userId);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

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
    const validatedData = updateDocumentSchema.parse(body);

    // 既存のドキュメントを確認
    const existing = await getDocumentById(id, userId);
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // parent_idが変更される場合は循環参照チェック
    if (validatedData.parent_id !== undefined && validatedData.parent_id !== existing.parent_id) {
      const hasCircularRef = await checkCircularReference(userId, id, validatedData.parent_id);
      if (hasCircularRef) {
        return NextResponse.json(
          { error: 'Circular reference detected' },
          { status: 400 }
        );
      }
    }

    const input: UpdateDocumentInput = {
      title: validatedData.title,
      content: validatedData.content,
      parent_id: validatedData.parent_id,
    };

    // バリデーション
    const validationError = validateUpdateDocumentInput(input, existing.type);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const result = await updateDocument(id, userId, input);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update document' },
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
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const success = await deleteDocument(id, userId);

    if (!success) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

