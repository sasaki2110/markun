import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/app/lib/utils';
import { query, queryOne } from '@/app/lib/db';
import { z } from 'zod';
import type { MarkdownDocument, UpdateDocumentInput } from '@/app/types/document';

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
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
    const document = await queryOne<MarkdownDocument>(
      'SELECT * FROM markdown_documents WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

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
    const existing = await queryOne<MarkdownDocument>(
      'SELECT * FROM markdown_documents WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 更新
    const updateFields: string[] = [];
    const updateValues: unknown[] = [];
    let paramIndex = 1;

    if (validatedData.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(validatedData.title);
      paramIndex++;
    }
    if (validatedData.content !== undefined) {
      updateFields.push(`content = $${paramIndex}`);
      updateValues.push(validatedData.content);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(existing);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);
    updateValues.push(userId);

    const result = await queryOne<MarkdownDocument>(
      `UPDATE markdown_documents
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      updateValues
    );

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

    const result = await queryOne<MarkdownDocument>(
      'DELETE FROM markdown_documents WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (!result) {
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

