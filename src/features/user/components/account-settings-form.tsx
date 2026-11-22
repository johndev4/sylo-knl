'use client';

import { useMemo, useState, useTransition } from 'react';
import { useSWRConfig } from 'swr';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { appToast } from '@/lib/toast';
import { updateUserProfile } from '@/features/user/actions';
import { VALID_TIMEZONES } from '@/lib/constants';
import { SWR_PROFILE_KEY } from '@/features/user/queries';
import { UserProfile } from '../user-schema';
import { Spinner } from '@/components/ui/spinner';
import { CheckIcon } from 'lucide-react';

interface FormError {
  field: string;
  message: string;
}

interface AccountSettingsFormProps {
  profile: UserProfile;
}

export default function AccountSettingsForm({
  profile: initialProfile,
}: AccountSettingsFormProps) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  const [formData, setFormData] = useState({
    name: initialProfile.name || '',
    bio: initialProfile.bio || '',
    timezone: initialProfile.timezone || '',
    useAvatarUrl: initialProfile.useAvatarUrl ?? true,
  });

  const [isPending, startTransition] = useTransition();
  const { mutate } = useSWRConfig();
  const [errors, setErrors] = useState<FormError[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { isDirty, isValid } = useMemo(() => {
    const dirty =
      formData.name !== (profile.name || '') ||
      formData.bio !== (profile.bio || '') ||
      formData.timezone !== (profile.timezone || '') ||
      formData.useAvatarUrl !== (profile.useAvatarUrl ?? true);

    const valid = formData.name.trim() !== '';

    return {
      isDirty: dirty,
      isValid: valid,
    };
  }, [formData, profile]);

  const canSave = isDirty && isValid && !isPending;

  const getSaveButtonDescription = () => {
    if (isPending) return 'Saving your changes…';
    if (saveSuccess) return 'Changes saved successfully!';
    if (!profile) return '';
    if (!isDirty) return 'No changes have been made to your profile yet.';
    if (!isValid) {
      return 'Required fields are missing. Please provide a name.';
    }

    return 'Click to save your profile changes.';
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setErrors((prev) => prev.filter((error) => error.field !== name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setErrors([]);

    startTransition(async () => {
      try {
        const updatedProfile = await updateUserProfile(formData);

        setProfile(updatedProfile);
        setSaveSuccess(true);

        // Revalidate the AccountDropdown via SWR — no custom events needed.
        await mutate(SWR_PROFILE_KEY);
        appToast.success('Profile updated successfully!');
      } catch (error) {
        // Handle Zod validation errors
        if (
          error &&
          typeof error === 'object' &&
          'issues' in error &&
          Array.isArray((error as { issues: unknown }).issues)
        ) {
          const zodError = error as {
            issues: Array<{
              path: (string | number)[];
              message: string;
            }>;
          };

          const fieldNames = new Set([
            'name',
            'bio',
            'timezone',
            'useAvatarUrl',
          ]);
          const fieldErrors = zodError.issues.filter((issue) =>
            fieldNames.has(issue.path.join('.'))
          );
          const generalErrors = zodError.issues.filter(
            (issue) => !fieldNames.has(issue.path.join('.'))
          );

          setErrors(
            fieldErrors.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            }))
          );
          generalErrors.forEach((issue) => appToast.error(issue.message));
        } else {
          appToast.error(
            (error instanceof Error && error.message) ||
              'An error occurred. Please try again.'
          );
        }
      }
    });
  };

  const getFieldError = (field: string) => {
    return errors.find((error) => error.field === field)?.message;
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-2xl">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl font-bold text-balance sm:text-3xl">
              Account Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your profile information
            </p>
          </div>

          {/* Profile Card */}
          <Card className="[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>

              <CardDescription>
                Update your profile details. Your email cannot be changed.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Read-only fields */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Email</Label>

                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="mt-1 cursor-not-allowed opacity-60"
                    />

                    <p className="text-muted-foreground mt-1 text-xs">
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                {/* Avatar Display Section */}
                {profile.avatarUrl && (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 sm:rounded-xl sm:p-6 dark:border-neutral-800 dark:bg-neutral-900/50">
                    <Label className="mb-3 block text-sm font-semibold tracking-tight sm:mb-4">
                      Avatar Display
                    </Label>

                    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
                      {/* Google Picture Option */}
                      <button
                        type="button"
                        aria-pressed={formData.useAvatarUrl}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            useAvatarUrl: true,
                          }))
                        }
                        className={cn(
                          'relative flex w-full flex-col items-center gap-2 rounded-xl border-2 p-3 transition-[border-color,background-color,box-shadow] duration-200 motion-reduce:transition-none sm:w-auto sm:gap-3 sm:p-4',
                          formData.useAvatarUrl
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-transparent bg-white hover:border-neutral-300 dark:bg-neutral-950 dark:hover:border-neutral-700'
                        )}
                      >
                        <div className="relative">
                          <UserAvatar
                            name={profile.name}
                            email={profile.email}
                            avatarUrl={profile.avatarUrl}
                            useAvatarUrl={true}
                            className="h-16 w-16 text-xl shadow-sm sm:h-20 sm:w-20 sm:text-2xl"
                          />

                          {formData.useAvatarUrl && (
                            <div className="bg-primary text-primary-foreground ring-background absolute -top-1 -right-1 rounded-full p-1 shadow-md ring-2">
                              <CheckIcon className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>

                        <span
                          className={cn(
                            'text-xs font-semibold tracking-wider uppercase',
                            formData.useAvatarUrl
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          )}
                        >
                          Google
                        </span>
                      </button>

                      {/* Initials Option */}
                      <button
                        type="button"
                        aria-pressed={!formData.useAvatarUrl}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            useAvatarUrl: false,
                          }))
                        }
                        className={cn(
                          'relative flex w-full flex-col items-center gap-2 rounded-xl border-2 p-3 transition-[border-color,background-color,box-shadow] duration-200 motion-reduce:transition-none sm:w-auto sm:gap-3 sm:p-4',
                          !formData.useAvatarUrl
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-transparent bg-white hover:border-neutral-300 dark:bg-neutral-950 dark:hover:border-neutral-700'
                        )}
                      >
                        <div className="relative">
                          <UserAvatar
                            name={profile.name}
                            email={profile.email}
                            useAvatarUrl={false}
                            className={cn(
                              'h-16 w-16 text-xl font-bold shadow-sm sm:h-20 sm:w-20 sm:text-2xl',
                              !formData.useAvatarUrl
                                ? 'bg-primary/10 text-primary'
                                : 'bg-neutral-200 dark:bg-neutral-800'
                            )}
                            fallbackClassName="text-xl font-bold sm:text-2xl"
                          />

                          {!formData.useAvatarUrl && (
                            <div className="bg-primary text-primary-foreground ring-background absolute -top-1 -right-1 rounded-full p-1 shadow-md ring-2">
                              <CheckIcon className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>

                        <span
                          className={cn(
                            'text-xs font-semibold tracking-wider uppercase',
                            !formData.useAvatarUrl
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          )}
                        >
                          Initials
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Editable fields */}
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <Label htmlFor="name">
                      Name
                      <span className="text-destructive ml-1">*</span>
                    </Label>

                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="off"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={isPending}
                      aria-invalid={Boolean(getFieldError('name'))}
                      aria-describedby={
                        getFieldError('name') ? 'name-error' : undefined
                      }
                      className={`mt-1 ${
                        getFieldError('name') ? 'border-destructive' : ''
                      }`}
                      maxLength={200}
                    />

                    {getFieldError('name') && (
                      <p
                        id="name-error"
                        className="text-destructive mt-1 text-xs"
                        aria-live="polite"
                      >
                        {getFieldError('name')}
                      </p>
                    )}
                  </div>

                  {/* Bio */}
                  <div>
                    <Label htmlFor="bio">Bio</Label>

                    <Textarea
                      id="bio"
                      name="bio"
                      placeholder="Tell us about yourself (optional)"
                      value={formData.bio}
                      onChange={handleChange}
                      disabled={isPending}
                      aria-invalid={Boolean(getFieldError('bio'))}
                      aria-describedby={
                        getFieldError('bio') ? 'bio-error' : undefined
                      }
                      className={`mt-1 ${
                        getFieldError('bio') ? 'border-destructive' : ''
                      }`}
                      rows={4}
                      maxLength={500}
                    />

                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-muted-foreground text-xs">
                        Max 500 characters
                      </p>

                      <p className="text-muted-foreground text-xs">
                        {formData.bio.length}/500
                      </p>
                    </div>

                    {getFieldError('bio') && (
                      <p
                        id="bio-error"
                        className="text-destructive mt-1 text-xs"
                        aria-live="polite"
                      >
                        {getFieldError('bio')}
                      </p>
                    )}
                  </div>

                  {/* Timezone */}
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>

                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          timezone: value ?? '',
                        }));

                        setErrors((prev) =>
                          prev.filter((error) => error.field !== 'timezone')
                        );
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger
                        id="timezone"
                        aria-invalid={Boolean(getFieldError('timezone'))}
                        aria-describedby={
                          getFieldError('timezone')
                            ? 'timezone-error'
                            : undefined
                        }
                        className={`mt-1 ${
                          getFieldError('timezone') ? 'border-destructive' : ''
                        }`}
                      >
                        <SelectValue placeholder="Select timezone (optional)" />
                      </SelectTrigger>

                      <SelectContent>
                        {VALID_TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {getFieldError('timezone') && (
                      <p
                        id="timezone-error"
                        className="text-destructive mt-1 text-xs"
                        aria-live="polite"
                      >
                        {getFieldError('timezone')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button Section */}
                <div className="border-border flex flex-col items-center justify-end gap-4 border-t pt-4 sm:flex-row">
                  {/* Accessibility Hint */}
                  <p
                    id="save-hint"
                    className={cn(
                      'text-xs font-medium transition-opacity duration-200',
                      isDirty && !isValid
                        ? 'text-destructive opacity-100'
                        : 'text-muted-foreground opacity-70',
                      !isDirty && !isPending && !saveSuccess
                        ? 'hidden sm:block'
                        : ''
                    )}
                    aria-live="polite"
                  >
                    {getSaveButtonDescription()}
                  </p>

                  <div className="flex w-full gap-3 sm:w-auto">
                    <Button
                      type="submit"
                      aria-disabled={!canSave}
                      aria-describedby="save-hint"
                      disabled={isPending || !canSave}
                      className={cn(
                        'flex-1 transition-[opacity,transform,colors] duration-200 sm:min-w-[140px]',
                        !canSave &&
                          !isPending &&
                          'cursor-not-allowed opacity-50 contrast-more:opacity-70'
                      )}
                    >
                      {isPending && <Spinner className="h-4 w-4" />}
                      <span>Save Changes</span>
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
