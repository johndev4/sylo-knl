import { redirect } from 'next/navigation';

/**
 * Redirect bookmarked /hub/libraries/[id]/chat URLs to the new unified chat page.
 */
export default async function LibraryChatRedirect(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  redirect(`/hub/chat?libraryId=${params.id}`);
}
