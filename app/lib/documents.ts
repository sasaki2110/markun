import { query, queryOne } from './db';
import { Document, CreateDocumentInput, UpdateDocumentInput, DocumentType } from '../types/document';

// ドキュメント関連のデータベース操作関数

export async function getDocuments(userId: string): Promise<Document[]> {
  const sql = `
    SELECT id, user_id, title, content, type, parent_id, created_at, updated_at
    FROM markdown_documents
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  return await query<Document>(sql, [userId]);
}

export async function getDocumentById(id: string, userId: string): Promise<Document | null> {
  const sql = `
    SELECT id, user_id, title, content, type, parent_id, created_at, updated_at
    FROM markdown_documents
    WHERE id = $1 AND user_id = $2
  `;
  return await queryOne<Document>(sql, [id, userId]);
}

export async function getDocumentsInFolder(userId: string, parentId: string | null): Promise<Document[]> {
  const sql = `
    SELECT id, user_id, title, content, type, parent_id, created_at, updated_at
    FROM markdown_documents
    WHERE user_id = $1 AND parent_id ${parentId === null ? 'IS NULL' : '= $2'}
    ORDER BY type ASC, title ASC
  `;
  return await query<Document>(sql, parentId === null ? [userId] : [userId, parentId]);
}

export async function createDocument(
  userId: string,
  input: CreateDocumentInput
): Promise<Document> {
  const sql = `
    INSERT INTO markdown_documents (user_id, title, content, type, parent_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, title, content, type, parent_id, created_at, updated_at
  `;

  const params = [
    userId,
    input.title,
    input.type === 'file' ? input.content : null,
    input.type,
    input.parent_id || null
  ];

  const result = await queryOne<Document>(sql, params);
  if (!result) {
    throw new Error('Failed to create document');
  }
  return result;
}

export async function updateDocument(
  id: string,
  userId: string,
  input: UpdateDocumentInput
): Promise<Document | null> {
  // 更新するフィールドを動的に構築
  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex}`);
    params.push(input.title);
    paramIndex++;
  }

  if (input.content !== undefined) {
    updates.push(`content = $${paramIndex}`);
    params.push(input.content);
    paramIndex++;
  }

  if (input.parent_id !== undefined) {
    updates.push(`parent_id = $${paramIndex}`);
    params.push(input.parent_id);
    paramIndex++;
  }

  if (updates.length === 0) {
    // 更新するフィールドがない場合は現在のデータを返す
    return await getDocumentById(id, userId);
  }

  updates.push(`updated_at = NOW()`);

  const sql = `
    UPDATE markdown_documents
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
    RETURNING id, user_id, title, content, type, parent_id, created_at, updated_at
  `;

  params.push(id, userId);

  return await queryOne<Document>(sql, params);
}

export async function deleteDocument(id: string, userId: string): Promise<boolean> {
  const sql = `
    DELETE FROM markdown_documents
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const result = await query(sql, [id, userId]);
  return result.length > 0;
}

export async function moveDocument(
  id: string,
  userId: string,
  newParentId: string | null
): Promise<Document | null> {
  const sql = `
    UPDATE markdown_documents
    SET parent_id = $1, updated_at = NOW()
    WHERE id = $2 AND user_id = $3
    RETURNING id, user_id, title, content, type, parent_id, created_at, updated_at
  `;
  return await queryOne<Document>(sql, [newParentId, id, userId]);
}

// ツリー構造取得用の関数
export async function getDocumentTree(userId: string): Promise<Document[]> {
  const sql = `
    SELECT id, user_id, title, content, type, parent_id, created_at, updated_at
    FROM markdown_documents
    WHERE user_id = $1
    ORDER BY parent_id ASC, type ASC, title ASC
  `;
  return await query<Document>(sql, [userId]);
}

// バリデーション関数
export function validateCreateDocumentInput(input: CreateDocumentInput): string | null {
  if (!input.title.trim()) {
    return 'タイトルは必須です';
  }

  if (input.type === 'folder' && input.content) {
    return 'フォルダの場合、コンテンツは指定できません';
  }

  return null;
}

export function validateUpdateDocumentInput(input: UpdateDocumentInput, currentType: DocumentType): string | null {
  if (input.content !== undefined && currentType === 'folder') {
    return 'フォルダのコンテンツは更新できません';
  }

  return null;
}

// 循環参照チェック
export async function checkCircularReference(
  userId: string,
  nodeId: string,
  newParentId: string | null
): Promise<boolean> {
  if (!newParentId || nodeId === newParentId) {
    return false;
  }

  // newParentIdがnodeIdの子孫かどうかをチェックするクエリ
  const sql = `
    WITH RECURSIVE descendants AS (
      SELECT id, parent_id
      FROM markdown_documents
      WHERE id = $1 AND user_id = $2

      UNION ALL

      SELECT md.id, md.parent_id
      FROM markdown_documents md
      INNER JOIN descendants d ON md.parent_id = d.id
      WHERE md.user_id = $2
    )
    SELECT COUNT(*) > 0 as has_circular_ref
    FROM descendants
    WHERE id = $3
  `;

  const result = await queryOne<{ has_circular_ref: boolean }>(sql, [newParentId, userId, nodeId]);
  return result?.has_circular_ref || false;
}