import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/app/lib/utils';
import { getDocuments, getDocumentsInFolder, createDocument, validateCreateDocumentInput } from '@/app/lib/documents';
import { z } from 'zod';
import type { Document, CreateDocumentInput } from '@/app/types/document';

const createDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  type: z.enum(['file', 'folder']),
  parent_id: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    // クエリパラメータでフォルダIDが指定された場合はそのフォルダ内のアイテムを取得
    // それ以外の場合は全ドキュメントを取得（後方互換性のため）
    const documents = folderId
      ? await getDocumentsInFolder(userId, folderId === 'null' ? null : folderId)
      : await getDocuments(userId);

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createDocumentSchema.parse(body);

    const input: CreateDocumentInput = {
      title: validatedData.title,
      content: validatedData.content,
      type: validatedData.type,
      parent_id: validatedData.parent_id,
    };

    // バリデーション
    const validationError = validateCreateDocumentInput(input);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const result = await createDocument(userId, input);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

