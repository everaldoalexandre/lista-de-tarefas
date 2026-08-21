'use client';

import Link from 'next/link';
import { ListTodo } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export default function SiteNav() {
  const { data: session, isPending } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ListTodo className="size-5" />
          </span>
          Lista de Tarefas
        </Link>
        <div className="flex items-center gap-2">
          {isPending ? null : session?.user ? (
            <Button asChild>
              <Link href="/app">Open app</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
