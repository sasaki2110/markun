'use client';

import { useState } from 'react';

interface DocumentEditorProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
}

export default function DocumentEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
}: DocumentEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="title"
          className="block text-base font-medium text-zinc-700 dark:text-zinc-300"
        >
          タイトル
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          placeholder="ドキュメントのタイトルを入力"
        />
      </div>
      <div>
        <label
          htmlFor="content"
          className="block text-base font-medium text-zinc-700 dark:text-zinc-300"
        >
          内容（Markdown）
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={20}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-base text-black shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          placeholder="# タイトル&#10;&#10;ここにマークダウンを入力..."
        />
      </div>
    </div>
  );
}

