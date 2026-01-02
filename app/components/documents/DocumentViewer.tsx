'use client';

import { Streamdown } from 'streamdown';

interface DocumentViewerProps {
  content: string;
  isAnimating?: boolean;
}

export default function DocumentViewer({
  content,
  isAnimating = false,
}: DocumentViewerProps) {
  return (
    <div className="prose prose-zinc prose-lg max-w-none dark:prose-invert">
      <Streamdown isAnimating={isAnimating}>{content}</Streamdown>
    </div>
  );
}

