'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string | null;
}

interface FormError {
  field: string;
  message: string;
}

const VALID_TIMEZONES = [
  'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Brussels',
  'Europe/Vienna', 'Europe/Prague', 'Europe/Warsaw', 'Europe/Moscow', 'Europe/Istanbul',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Hong_Kong', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Asia/Manila', 'Asia/Jakarta',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth',
  'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Honolulu',
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    timezone: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormError[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

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
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setErrors([{ field: 'general', message: 'Failed to load profile. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors for this field when user starts typing
    setErrors(prev => prev.filter(e => e.field !== name));
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
          setErrors([{ field: 'general', message: data.error || 'Failed to update profile' }]);
        }
        return;
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors([{ field: 'general', message: 'An error occurred. Please try again.' }]);
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(e => e.field === field)?.message;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/spaces')}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your profile information</p>
          </div>

          {/* Alerts */}
          {errors.some(e => e.field === 'general') && (
            <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              {errors.find(e => e.field === 'general')?.message}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg border border-green-500/20">
              {successMessage}
            </div>
          )}

          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile details. Your email and avatar cannot be changed.</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Read-only fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="mt-1 opacity-60 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                  </div>
                </div>

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
                      <p className="text-xs text-destructive mt-1">{getFieldError('name')}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <textarea
                      id="bio"
                      name="bio"
                      placeholder="Tell us about yourself (optional)"
                      value={formData.bio}
                      onChange={handleChange}
                      disabled={submitting}
                      className={`mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${
                        getFieldError('bio') ? 'border-destructive' : ''
                      }`}
                      rows={4}
                      maxLength={500}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground">Max 500 characters</p>
                      <p className="text-xs text-muted-foreground">
                        {formData.bio.length}/500
                      </p>
                    </div>
                    {getFieldError('bio') && (
                      <p className="text-xs text-destructive mt-1">{getFieldError('bio')}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleChange}
                      disabled={submitting}
                      className={`mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${
                        getFieldError('timezone') ? 'border-destructive' : ''
                      }`}
                    >
                      <option value="">Select timezone (optional)</option>
                      {VALID_TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                    {getFieldError('timezone') && (
                      <p className="text-xs text-destructive mt-1">{getFieldError('timezone')}</p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        name: profile.name || '',
                        bio: profile.bio || '',
                        timezone: profile.timezone || '',
                      });
                      setErrors([]);
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
