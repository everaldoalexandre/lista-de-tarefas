import Link from 'next/link';
import { CalendarCheck, FolderKanban, GripVertical, CircleCheckBig } from 'lucide-react';
import SiteNav from '@/components/SiteNav';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: FolderKanban,
    title: 'Projects',
    description: 'Group your tasks into projects and keep track of how many are pending in each one.',
  },
  {
    icon: GripVertical,
    title: 'Drag & drop',
    description: 'Reorder your tasks by simply dragging them, so the most important ones stay on top.',
  },
  {
    icon: CalendarCheck,
    title: 'Due dates',
    description: 'Attach a date to any task and never lose a deadline again.',
  },
  {
    icon: CircleCheckBig,
    title: 'Completed archive',
    description: 'Finished tasks move to a collapsible section at the bottom, keeping your list clean.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Create an account',
    description: 'Sign up with your email and password — it takes less than a minute.',
  },
  {
    number: '2',
    title: 'Add a project',
    description: 'Create a project for each area of your life or work, like "Home" or "Website".',
  },
  {
    number: '3',
    title: 'Add and organize tasks',
    description: 'Write tasks, set due dates, drag to prioritize and check them off when done.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <SiteNav />

      <main>
        <section className="mx-auto max-w-5xl px-4 pt-20 pb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Organize your day, project by project
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A simple and fast task manager. Create projects, add tasks with due dates,
            drag to prioritize and keep everything under control.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/register">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">What you can do</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl bg-card border border-border p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-bold text-foreground">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-muted/40 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">How it works</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="rounded-2xl bg-card border border-border p-6 shadow-sm">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                    {step.number}
                  </span>
                  <h3 className="mt-4 font-bold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Lista de Tarefas. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
