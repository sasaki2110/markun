import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import DocumentTreeView from '@/app/components/documents/DocumentTreeView';

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return <DocumentTreeView />;
}

