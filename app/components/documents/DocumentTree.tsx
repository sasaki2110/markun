'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { DocumentTreeNode, DocumentType } from '@/app/types/document';

interface TreeNodeProps {
  node: DocumentTreeNode;
  level: number;
  onSelect: (node: DocumentTreeNode) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateFile: (parentId: string | null) => void;
  onMove: (nodeId: string, newParentId: string | null) => void;
  onDelete: (nodeId: string) => void;
  selectedId?: string;
}

function TreeNode({
  node,
  level,
  onSelect,
  onCreateFolder,
  onCreateFile,
  onMove,
  onDelete,
  selectedId
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setIsContextMenuOpen(true);
  }, []);

  const handleClickOutside = useCallback(() => {
    setIsContextMenuOpen(false);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.id);
    setIsDragging(true);
  }, [node.id]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId !== node.id && node.type === 'folder') {
      onMove(draggedId, node.id);
    }
    setIsDragging(false);
  }, [node.id, node.type, onMove]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const isSelected = selectedId === node.id;

  return (
    <>
      <div
        className={`group flex cursor-pointer items-center py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          isSelected ? 'bg-zinc-200 dark:bg-zinc-700' : ''
        } ${isDragging ? 'opacity-50' : ''}`}
        style={{ paddingLeft: level * 16 + 8 }}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDrop={node.type === 'folder' ? handleDrop : undefined}
        onDragOver={node.type === 'folder' ? handleDragOver : undefined}
        onContextMenu={handleContextMenu}
      >
        {node.type === 'folder' && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mr-1 flex h-4 w-4 items-center justify-center text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}

        {node.type === 'folder' ? (
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              onSelect(node);
            }}
            className="flex items-center text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            📁 {node.title}
          </button>
        ) : (
          <Link
            href={`/documents/${node.id}`}
            onClick={() => onSelect(node)}
            className="flex items-center text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            📄 {node.title}
          </Link>
        )}

        <div className="ml-auto opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="ml-2 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            ×
          </button>
        </div>
      </div>

      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onCreateFolder={onCreateFolder}
              onCreateFile={onCreateFile}
              onMove={onMove}
              onDelete={onDelete}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}

      {isContextMenuOpen && (
        <div
          className="fixed z-50 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          onClick={handleClickOutside}
        >
          <button
            onClick={() => {
              onCreateFolder(node.id);
              setIsContextMenuOpen(false);
            }}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            新規フォルダ
          </button>
          <button
            onClick={() => {
              onCreateFile(node.id);
              setIsContextMenuOpen(false);
            }}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            新規ファイル
          </button>
        </div>
      )}
    </>
  );
}

interface DocumentTreeProps {
  tree: DocumentTreeNode;
  selectedId?: string;
  onSelect: (node: DocumentTreeNode) => void;
  onCreateFolder: (parentId: string | null) => void;
  onCreateFile: (parentId: string | null) => void;
  onMove: (nodeId: string, newParentId: string | null) => void;
  onDelete: (nodeId: string) => void;
}

export default function DocumentTree({
  tree,
  selectedId,
  onSelect,
  onCreateFolder,
  onCreateFile,
  onMove,
  onDelete
}: DocumentTreeProps) {
  return (
    <div className="h-full overflow-auto bg-white dark:bg-zinc-900">
      <div className="p-4">
        <div className="space-y-1">
          {tree.children?.map(node => (
            <TreeNode
              key={node.id}
              node={node}
              level={0}
              onSelect={onSelect}
              onCreateFolder={onCreateFolder}
              onCreateFile={onCreateFile}
              onMove={onMove}
              onDelete={onDelete}
              selectedId={selectedId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}