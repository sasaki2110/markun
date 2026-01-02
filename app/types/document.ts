export interface MarkdownDocument {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentInput {
  title: string;
  content: string;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
}

