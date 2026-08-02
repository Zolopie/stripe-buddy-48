import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Landmark, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/proposal-sent")({
  head: () => ({
    meta: [
      { title: "Proposal Sent — Meridian Grove Corporate Practice" },
      {
        name: "description",
        content:
          "Your secure premium invoice and project proposal outline are on their way. Our executive team verifies payment and schedules your kickoff within 24 hours of clearance.",
      },
      { property: "og:title", content: "Proposal Sent — Meridian Grove" },
      {
        property: "og:description",
        content:
          "Your secure corporate invoice and proposal outline have been emailed. Executive onboarding follows within 24 hours of payment clearance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProposalSent,
});

function ProposalSent() {
  return (
    <div className="hero-surface flex min-h-screen flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-5">
          <Landmark className="size-5 text-gold" />
          <span className="font-display text-lg tracking-wide">Meridian Grove</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="rounded-full border border-gold/40 p-4">
          <CheckCircle2 className="size-9 text-gold" />
        </span>

        <p className="mt-8 text-[11px] uppercase tracking-[0.35em] text-gold">
          Proposal confirmed
        </p>
        <h1 className="mt-5 text-4xl leading-tight md:text-5xl">
          Your executive invoice is <span className="text-gradient-gold">on its way</span>
        </h1>

        <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
          Your secure premium invoice and project proposal outline have been sent to your email.
          Please review and complete the payment on Stripe's secure corporate portal. Because these
          are bespoke high-value services, our executive team will manually verify the payment and
          reach out directly to your email within 24 hours of clearance to schedule your official
          project kickoff and onboarding session.
        </p>

        <div className="mt-12 grid w-full gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-card/70 p-6 text-left">
            <Mail className="size-5 text-gold" />
            <h2 className="mt-4 text-lg">Check your inbox</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The invoice is delivered from our payment provider. If it hasn't arrived in a few
              minutes, check your spam or quarantine filters.
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card/70 p-6 text-left">
            <ShieldCheck className="size-5 text-gold" />
            <h2 className="mt-4 text-lg">Manual verification</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every high-value engagement is reviewed by a practice partner before contracts and
              onboarding are released.
            </p>
          </div>
        </div>

        <Button variant="hairline" size="lg" className="mt-12" asChild>
          <Link to="/">Return to the engagement catalogue</Link>
        </Button>
      </main>
    </div>
  );
}