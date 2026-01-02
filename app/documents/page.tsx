import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import DocumentList from '@/app/components/documents/DocumentList';

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return <DocumentList />;
}

