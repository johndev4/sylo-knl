'use client';

import { useMemo, useState, useTransition } from 'react';
import { useSWRConfig } from 'swr';
import Image from 'next/image';

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
import { Check } from 'lucide-react';
import { updateUserProfile } from '@/features/user/actions';
import { VALID_TIMEZONES } from '@/lib/constants';
import { SWR_PROFILE_KEY } from '@/features/user/queries';
import { UserProfile } from '../user-schema';
import { Spinner } from '@/components/ui/spinner';

interface FormError {
  field: string;
  message: string;
}

interface AccountSettingsFormProps {
  profile: UserProfile;
}

// Utility that returns 2-letter initials from a name or email.
const makeInitials = (displayName: string | null, email: string): string => {
  const source = displayName || email.split('@')[0];
  return source
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

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
  const [successMessage, setSuccessMessage] = useState('');
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
    setSuccessMessage('');

    startTransition(async () => {
      try {
        const updatedProfile = await updateUserProfile(formData);

        setProfile(updatedProfile);
        setSuccessMessage('Profile updated successfully!');
        setSaveSuccess(true);

        // Revalidate the AccountDropdown via SWR — no custom events needed.
        await mutate(SWR_PROFILE_KEY);

        setTimeout(() => {
          setSuccessMessage('');
          setSaveSuccess(false);
        }, 3000);
      } catch (error) {
        console.error('Error updating profile:', error);

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

          setErrors(
            zodError.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            }))
          );
        } else {
          setErrors([
            {
              field: 'general',
              message:
                (error instanceof Error && error.message) ||
                'An error occurred. Please try again.',
            },
          ]);
        }
      }
    });
  };

  const getFieldError = (field: string) => {
    return errors.find((error) => error.field === field)?.message;
  };

  const initials = makeInitials(profile.name!, profile.email);

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your profile information
            </p>
          </div>

          {/* Alerts */}
          {errors.some((error) => error.field === 'general') && (
            <div className="bg-destructive/10 text-destructive border-destructive/20 mb-6 rounded-lg border p-4">
              {errors.find((error) => error.field === 'general')?.message}
            </div>
          )}

          {successMessage && (
            <div className="animate-in fade-in slide-in-from-top-2 mb-6 flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-green-700 duration-300 dark:text-green-400">
              <div className="rounded-full bg-green-500/20 p-1">
                <Check className="h-4 w-4" />
              </div>

              <p className="text-sm font-medium">{successMessage}</p>
            </div>
          )}

          {/* Profile Card */}
          <Card>
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
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-6 dark:border-neutral-800 dark:bg-neutral-900/50">
                    <Label className="mb-4 block text-sm font-semibold tracking-tight">
                      Avatar Display
                    </Label>

                    <div className="flex flex-wrap gap-4">
                      {/* Google Picture Option */}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            useAvatarUrl: true,
                          }))
                        }
                        className={cn(
                          'relative flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition-all duration-200',
                          formData.useAvatarUrl
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-transparent bg-white hover:border-neutral-300 dark:bg-neutral-950 dark:hover:border-neutral-700'
                        )}
                      >
                        <div className="relative">
                          <Image
                            src={profile.avatarUrl}
                            alt="Google avatar"
                            width={80}
                            height={80}
                            unoptimized
                            className="h-20 w-20 rounded-full bg-neutral-100 object-cover shadow-sm dark:bg-neutral-800"
                          />

                          {formData.useAvatarUrl && (
                            <div className="bg-primary text-primary-foreground ring-background absolute -top-1 -right-1 rounded-full p-1 shadow-md ring-2">
                              <Check className="h-3.5 w-3.5" />
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
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            useAvatarUrl: false,
                          }))
                        }
                        className={cn(
                          'relative flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition-all duration-200',
                          !formData.useAvatarUrl
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-transparent bg-white hover:border-neutral-300 dark:bg-neutral-950 dark:hover:border-neutral-700'
                        )}
                      >
                        <div className="relative">
                          <div
                            className={cn(
                              'flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold shadow-sm',
                              !formData.useAvatarUrl
                                ? 'bg-primary/10 text-primary'
                                : 'text-foreground bg-neutral-200 dark:bg-neutral-800'
                            )}
                          >
                            {initials}
                          </div>

                          {!formData.useAvatarUrl && (
                            <div className="bg-primary text-primary-foreground ring-background absolute -top-1 -right-1 rounded-full p-1 shadow-md ring-2">
                              <Check className="h-3.5 w-3.5" />
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
                      placeholder="Your name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={isPending}
                      className={`mt-1 ${
                        getFieldError('name') ? 'border-destructive' : ''
                      }`}
                      maxLength={200}
                    />

                    {getFieldError('name') && (
                      <p className="text-destructive mt-1 text-xs">
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
                      <p className="text-destructive mt-1 text-xs">
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
                      <p className="text-destructive mt-1 text-xs">
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
