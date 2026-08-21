'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Your new password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('The passwords do not match.');
      return;
    }

    setSubmitting(true);

    await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    }, {
      onSuccess() {
        toast.success('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      },
      onError(ctx) {
        if (ctx?.error?.code?.includes('INVALID_PASSWORD')) {
          toast.error('Current password is incorrect.');
        } else if (ctx?.error?.code?.includes('PASSWORD_TOO_SHORT')) {
          toast.error('Your new password must be at least 8 characters long.');
        } else {
          toast.error('Failed to change password. Please try again.');
        }
      },
      onFinish() {
        setSubmitting(false);
      },
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Update your password. Other active sessions will be signed out.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat the new password"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving...' : 'Save new password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
