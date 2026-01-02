import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/app/lib/utils';
import { query, queryOne } from '@/app/lib/db';
import { z } from 'zod';
import type { MarkdownDocument, CreateDocumentInput } from '@/app/types/document';

const createDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documents = await query<MarkdownDocument>(
      'SELECT * FROM markdown_documents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

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

    const result = await queryOne<MarkdownDocument>(
      `INSERT INTO markdown_documents (user_id, title, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, validatedData.title, validatedData.content]
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to create document' },
        { status: 500 }
      );
    }

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

