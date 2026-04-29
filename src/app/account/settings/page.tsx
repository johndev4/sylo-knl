'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string | null;
  useAvatarUrl: boolean;
}

interface FormError {
  field: string;
  message: string;
}

const VALID_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Vienna',
  'Europe/Prague',
  'Europe/Warsaw',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Asia/Manila',
  'Asia/Jakarta',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Pacific/Honolulu',
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    timezone: '',
    useAvatarUrl: true,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormError[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch user profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
      setFormData({
        name: data.name || '',
        bio: data.bio || '',
        timezone: data.timezone || '',
        useAvatarUrl: data.useAvatarUrl ?? true,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setErrors([
        {
          field: 'general',
          message: 'Failed to load profile. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const { isDirty, isValid } = useMemo(() => {
    if (!profile) return { isDirty: false, isValid: false };

    const dirty =
      formData.name !== (profile.name || '') ||
      formData.bio !== (profile.bio || '') ||
      formData.timezone !== (profile.timezone || '') ||
      formData.useAvatarUrl !== (profile.useAvatarUrl ?? true);

    const valid = formData.name.trim() !== '';

    return { isDirty: dirty, isValid: valid };
  }, [formData, profile]);

  const canSave = isDirty && isValid && !submitting;

  const getSaveButtonDescription = () => {
    if (submitting) return 'Saving your changes...';
    if (saveSuccess) return 'Changes saved successfully!';
    if (!profile) return '';
    if (!isDirty) return 'No changes have been made to your profile yet.';
    if (!isValid) return 'Required fields are missing. Please provide a name.';
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
    // Clear errors for this field when user starts typing
    setErrors((prev) => prev.filter((e) => e.field !== name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');

    try {
      setSubmitting(true);

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 400 && data.details) {
          setErrors(data.details);
        } else {
          setErrors([
            {
              field: 'general',
              message: data.error || 'Failed to update profile',
            },
          ]);
        }
        return;
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setSuccessMessage('Profile updated successfully!');
      setSaveSuccess(true);

      // Notify other components (like the Navbar) that the profile has changed
      window.dispatchEvent(new Event('profile-updated'));

      setTimeout(() => {
        setSuccessMessage('');
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors([
        { field: 'general', message: 'An error occurred. Please try again.' },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find((e) => e.field === field)?.message;
  };

  const getInitials = (displayName: string | null, email: string): string => {
    const source = displayName || email.split('@')[0];
    return source
      .split(/[\s._-]+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load profile. Please try refreshing the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = getInitials(profile.name, profile.email);

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/hub')}
              className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 text-sm"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your profile information
            </p>
          </div>

          {/* Alerts */}
          {errors.some((e) => e.field === 'general') && (
            <div className="bg-destructive/10 text-destructive border-destructive/20 mb-6 rounded-lg border p-4">
              {errors.find((e) => e.field === 'general')?.message}
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
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
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
                            : 'border-transparent bg-white hover:border-zinc-300 dark:bg-zinc-950 dark:hover:border-zinc-700'
                        )}
                      >
                        <div className="relative">
                          <img
                            src={profile.avatarUrl}
                            alt="Google avatar"
                            referrerPolicy="no-referrer"
                            className="h-20 w-20 rounded-full bg-zinc-100 object-cover shadow-sm dark:bg-zinc-800"
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
                          Google Picture
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
                            : 'border-transparent bg-white hover:border-zinc-300 dark:bg-zinc-950 dark:hover:border-zinc-700'
                        )}
                      >
                        <div className="relative">
                          <div
                            className={cn(
                              'flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold shadow-sm',
                              !formData.useAvatarUrl
                                ? 'bg-primary/10 text-primary'
                                : 'text-foreground bg-zinc-200 dark:bg-zinc-800'
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
                      disabled={submitting}
                      className={`mt-1 ${getFieldError('name') ? 'border-destructive' : ''}`}
                      maxLength={200}
                    />
                    {getFieldError('name') && (
                      <p className="text-destructive mt-1 text-xs">
                        {getFieldError('name')}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      placeholder="Tell us about yourself (optional)"
                      value={formData.bio}
                      onChange={handleChange}
                      disabled={submitting}
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

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          timezone: value,
                        }));
                        setErrors((prev) =>
                          prev.filter((e) => e.field !== 'timezone')
                        );
                      }}
                      disabled={submitting}
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
                  {/* Accessibility Hint (Visible only when needed or for screen readers) */}
                  <p
                    id="save-hint"
                    className={cn(
                      'text-xs font-medium transition-opacity duration-200',
                      isDirty && !isValid
                        ? 'text-destructive opacity-100'
                        : 'text-muted-foreground opacity-70',
                      !isDirty && !submitting && !saveSuccess
                        ? 'hidden sm:block'
                        : ''
                    )}
                    aria-live="polite"
                  >
                    {getSaveButtonDescription()}
                  </p>

                  <div className="flex w-full gap-3 sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        setFormData({
                          name: profile.name || '',
                          bio: profile.bio || '',
                          timezone: profile.timezone || '',
                          useAvatarUrl: profile.useAvatarUrl ?? true,
                        });
                        setErrors([]);
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      aria-disabled={!canSave}
                      aria-describedby="save-hint"
                      disabled={submitting} // Native disabled only during active submission
                      className={cn(
                        'flex-1 transition-all duration-200 sm:min-w-[140px]',
                        !canSave &&
                          !submitting &&
                          'cursor-not-allowed opacity-50 contrast-more:opacity-70',
                        saveSuccess &&
                          'border-green-600 bg-green-600 hover:bg-green-600'
                      )}
                      onClick={(e) => {
                        // Prevent click if aria-disabled
                        if (!canSave && !submitting) {
                          e.preventDefault();
                          return;
                        }
                      }}
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                          <span>Saving...</span>
                        </div>
                      ) : saveSuccess ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          <span>Saved!</span>
                        </div>
                      ) : (
                        'Save Changes'
                      )}
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
