import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, makeInitials } from '@/lib/utils';

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  useAvatarUrl?: boolean;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({
  name,
  email,
  avatarUrl,
  useAvatarUrl,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const initials = makeInitials(name || null, email || '');
  const shouldShowImage = useAvatarUrl && !!avatarUrl;

  return (
    <Avatar className={cn('size-8', className)}>
      {shouldShowImage && (
        <AvatarImage src={avatarUrl!} alt={name || 'User avatar'} />
      )}
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );
}
