"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";

export default function TeamPage() {
  const { developer } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage who has access to your AuthForge workspace.
          </p>
        </div>
        <Button disabled>Invite Member</Button>
      </div>

      <Card>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                {developer?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {developer?.name ?? "You"}
                </p>
                <p className="text-sm text-gray-500">{developer?.email}</p>
              </div>
            </div>
            <Badge variant="success">Owner</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <div className="py-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <h3 className="mt-3 text-sm font-medium text-gray-900">
            Team invitations coming soon
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You&apos;ll be able to invite team members to collaborate on your
            applications.
          </p>
        </div>
      </Card>
    </div>
  );
}
