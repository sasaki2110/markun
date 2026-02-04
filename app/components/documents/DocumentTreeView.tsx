'use client';

import { useEffect, useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import DocumentTree from './DocumentTree';
import type { DocumentTreeNode, Document, CreateDocumentInput } from '@/app/types/document';

interface DocumentTreeViewProps {
  initialTree?: DocumentTreeNode;
}

export default function DocumentTreeView({ initialTree }: DocumentTreeViewProps) {
  const [tree, setTree] = useState<DocumentTreeNode | null>(initialTree || null);
  const [loading, setLoading] = useState(!initialTree);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState<DocumentTreeNode | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState('');
  const [folderContents, setFolderContents] = useState<Document[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);
  const [sortBy, setSortBy] = useState<'created_asc' | 'created_desc' | 'updated_asc' | 'updated_desc' | 'name_asc' | 'name_desc'>('updated_desc');

  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents/tree');
      if (!response.ok) {
        throw new Error('Failed to fetch document tree');
      }
      const data = await response.json();
      setTree(data);
    } catch (err) {
      setError('ツリーの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialTree) {
      fetchTree();
    }
  }, [fetchTree, initialTree]);

  const handleCreateFolder = useCallback((parentId: string | null) => {
    setCreateType('folder');
    setCreateParentId(parentId);
    setCreateTitle('');
    setShowCreateDialog(true);
  }, []);

  const handleCreateFile = useCallback((parentId: string | null) => {
    setCreateType('file');
    setCreateParentId(parentId);
    setCreateTitle('');
    setShowCreateDialog(true);
  }, []);

  const handleCreateSubmit = useCallback(async () => {
    if (!createTitle.trim()) return;

    try {
      const endpoint = createType === 'folder' ? '/api/documents/folder' : '/api/documents';
      const body: CreateDocumentInput = {
        title: createTitle.trim(),
        type: createType,
        parent_id: createParentId,
      };

      if (createType === 'file') {
        body.content = ''; // 空のファイルを作成
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      setShowCreateDialog(false);
      setCreateTitle('');
      await fetchTree();
    } catch (err) {
      alert('作成に失敗しました');
      console.error(err);
    }
  }, [createTitle, createType, createParentId, fetchTree]);

  const handleMove = useCallback(async (nodeId: string, newParentId: string | null) => {
    try {
      const response = await fetch(`/api/documents/${nodeId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: newParentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move document');
      }

      await fetchTree();
    } catch (err: any) {
      alert(`移動に失敗しました: ${err.message}`);
      console.error(err);
    }
  }, [fetchTree]);

  const handleDelete = useCallback(async (nodeId: string) => {
    if (!confirm('このアイテムを削除しますか？フォルダの場合、中身もすべて削除されます。')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${nodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      await fetchTree();
    } catch (err) {
      alert('削除に失敗しました');
      console.error(err);
    }
  }, [fetchTree]);

  const sortDocuments = useCallback((documents: Document[], sortType: typeof sortBy) => {
    return [...documents].sort((a, b) => {
      switch (sortType) {
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_asc':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'updated_desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'name_asc':
          return a.title.localeCompare(b.title, 'ja');
        case 'name_desc':
          return b.title.localeCompare(a.title, 'ja');
        default:
          return 0;
      }
    });
  }, []);

  const fetchFolderContents = useCallback(async (folderId: string | null) => {
    try {
      setLoadingContents(true);
      const url = folderId ? `/api/documents?folderId=${folderId}` : '/api/documents?folderId=null';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch folder contents');
      }
      const data = await response.json();
      setFolderContents(data);
    } catch (err) {
      console.error('Error fetching folder contents:', err);
      setFolderContents([]);
    } finally {
      setLoadingContents(false);
    }
  }, []);

  const sortedFolderContents = sortDocuments(folderContents, sortBy);

  const handleSelect = useCallback((node: DocumentTreeNode) => {
    setSelectedNode(node);
    if (node.type === 'folder') {
      fetchFolderContents(node.id);
    } else {
      setFolderContents([]);
    }
  }, [fetchFolderContents]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-black">
      {/* サイドバー */}
      <div className="w-80 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            ドキュメント
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateFolder(null)}
              className="rounded p-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              title="新規フォルダ"
            >
              📁
            </button>
            <button
              onClick={() => handleCreateFile(null)}
              className="rounded p-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              title="新規ファイル"
            >
              📄
            </button>
          </div>
        </div>

        <div className="h-[calc(100vh-4rem)] overflow-hidden">
          {tree && (
            <DocumentTree
              tree={tree}
              selectedId={selectedNode?.id}
              onSelect={handleSelect}
              onCreateFolder={handleCreateFolder}
              onCreateFile={handleCreateFile}
              onMove={handleMove}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col">
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-4">
            {selectedNode && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {selectedNode.type === 'folder' ? '📁' : '📄'} {selectedNode.title}
              </div>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ログアウト
          </button>
        </div>

        <div className="flex-1 p-8">
          {selectedNode ? (
            <div className="h-full">
              {selectedNode.type === 'folder' ? (
                <div
                  className="h-full border-2 border-dashed border-zinc-300 rounded-lg p-6 dark:border-zinc-600"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-zinc-500', 'dark:border-zinc-400');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-zinc-500', 'dark:border-zinc-400');
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-zinc-500', 'dark:border-zinc-400');
                    const draggedId = e.dataTransfer.getData('text/plain');
                    if (draggedId && draggedId !== selectedNode.id) {
                      try {
                        await handleMove(draggedId, selectedNode.id);
                        // 移動後にフォルダの内容を更新
                        await fetchFolderContents(selectedNode.id);
                      } catch (err) {
                        // エラーはhandleMoveで処理済み
                      }
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      📁 {selectedNode.title}
                    </h2>
                    <div className="flex items-center gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                      >
                        <option value="updated_desc">更新日降順</option>
                        <option value="updated_asc">更新日昇順</option>
                        <option value="created_desc">作成日降順</option>
                        <option value="created_asc">作成日昇順</option>
                        <option value="name_asc">名前昇順</option>
                        <option value="name_desc">名前降順</option>
                      </select>
                      <button
                        onClick={() => handleCreateFolder(selectedNode.id)}
                        className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        📁 新規フォルダ
                      </button>
                      <button
                        onClick={() => handleCreateFile(selectedNode.id)}
                        className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        📄 新規ファイル
                      </button>
                    </div>
                  </div>

                  {loadingContents ? (
                    <div className="text-center text-zinc-500 dark:text-zinc-400">
                      読み込み中...
                    </div>
                  ) : folderContents.length === 0 ? (
                    <div className="text-center text-zinc-500 dark:text-zinc-400">
                      <div className="text-4xl mb-4">📂</div>
                      <p>このフォルダは空です</p>
                      <p className="text-sm mt-2">ファイルをドラッグ&ドロップするか、ボタンで新規作成してください</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sortedFolderContents.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow dark:border-zinc-700 dark:bg-zinc-800"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {item.type === 'folder' ? (
                                <button
                                  onClick={() => handleSelect({
                                    id: item.id,
                                    user_id: item.user_id,
                                    title: item.title,
                                    type: item.type,
                                    parent_id: item.parent_id,
                                    created_at: item.created_at,
                                    updated_at: item.updated_at,
                                    children: []
                                  })}
                                  className="text-lg font-semibold text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
                                >
                                  📁 {item.title}
                                </button>
                              ) : (
                                <Link
                                  href={`/documents/${item.id}`}
                                  className="text-lg font-semibold text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
                                >
                                  📄 {item.title}
                                </Link>
                              )}
                              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                作成: {new Date(item.created_at).toLocaleString('ja-JP')}
                                {item.updated_at !== item.created_at && (
                                  <span className="ml-2">
                                    更新: {new Date(item.updated_at).toLocaleString('ja-JP')}
                                  </span>
                                )}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="ml-2 rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              title="削除"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📄</div>
                    <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                      {selectedNode.title}
                    </h2>
                    <Link
                      href={`/documents/${selectedNode.id}`}
                      className="inline-block rounded-md bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      ドキュメントを開く
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-zinc-500 dark:text-zinc-400">
                <div className="text-6xl mb-4">📚</div>
                <h2 className="text-2xl font-bold mb-2">ドキュメントツリー</h2>
                <p>左のツリーからドキュメントを選択してください</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 作成ダイアログ */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-96 rounded-lg bg-white p-6 dark:bg-zinc-800">
            <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-zinc-100">
              新規{createType === 'folder' ? 'フォルダ' : 'ファイル'}作成
            </h3>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder={`${createType === 'folder' ? 'フォルダ' : 'ファイル'}名`}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 mb-4 focus:border-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSubmit();
                if (e.key === 'Escape') setShowCreateDialog(false);
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={!createTitle.trim()}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}