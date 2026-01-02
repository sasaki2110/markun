'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import type { MarkdownDocument } from '@/app/types/document';

export default function DocumentList() {
  const [documents, setDocuments] = useState<MarkdownDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      setError('ドキュメントの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このドキュメントを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      fetchDocuments();
    } catch (err) {
      alert('削除に失敗しました');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
            マークダウンドキュメント
          </h1>
          <div className="flex gap-4">
            <Link
              href="/documents/new"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              新規作成
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              ログアウト
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {documents.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              ドキュメントがありません。新規作成ボタンから作成してください。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="text-xl font-semibold text-black hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300"
                    >
                      {doc.title}
                    </Link>
                    <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
                      作成: {new Date(doc.created_at).toLocaleString('ja-JP')}
                      {doc.updated_at !== doc.created_at && (
                        <span className="ml-4">
                          更新: {new Date(doc.updated_at).toLocaleString('ja-JP')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <Link
                      href={`/documents/${doc.id}/edit`}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      編集
                    </Link>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

