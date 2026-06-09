import { redirect } from 'next/navigation';

export default async function LibraryIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/hub/libraries/${id}/documents`);
}
