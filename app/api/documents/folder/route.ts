import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/app/lib/utils';
import { createDocument, validateCreateDocumentInput } from '@/app/lib/documents';
import { z } from 'zod';
import type { CreateDocumentInput } from '@/app/types/document';

const createFolderSchema = z.object({
  title: z.string().min(1).max(255),
  parent_id: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createFolderSchema.parse(body);

    const input: CreateDocumentInput = {
      title: validatedData.title,
      type: 'folder',
      parent_id: validatedData.parent_id,
      // contentはフォルダなので指定しない
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
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}