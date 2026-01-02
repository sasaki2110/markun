'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DocumentViewer from '@/app/components/documents/DocumentViewer';
import type { MarkdownDocument } from '@/app/types/document';

export default function DocumentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [document, setDocument] = useState<MarkdownDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchDocument() {
      try {
        const { id } = await params;
        const response = await fetch(`/api/documents/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('ドキュメントが見つかりません');
          } else {
            throw new Error('Failed to fetch document');
          }
          return;
        }
        const data = await response.json();
        setDocument(data);
      } catch (err) {
        setError('ドキュメントの取得に失敗しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [params]);

  const handleDelete = async () => {
    if (!document || !confirm('このドキュメントを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      router.push('/documents');
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

  if (error || !document) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
            <p className="text-red-800 dark:text-red-400">{error || 'ドキュメントが見つかりません'}</p>
            <Link
              href="/documents"
              className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
              {document.title}
            </h1>
            <p className="mt-2 text-base text-zinc-500 dark:text-zinc-400">
              作成: {new Date(document.created_at).toLocaleString('ja-JP')}
              {document.updated_at !== document.created_at && (
                <span className="ml-4">
                  更新: {new Date(document.updated_at).toLocaleString('ja-JP')}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/documents/${document.id}/edit`}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              編集
            </Link>
            <button
              onClick={handleDelete}
              className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              削除
            </button>
            <Link
              href="/documents"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              一覧に戻る
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <DocumentViewer content={document.content} />
        </div>
      </div>
    </div>
  );
}

