import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  Clock3,
  Globe2,
  Landmark,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProposalModal } from "@/components/ProposalModal";
import { getServices } from "@/lib/catalog.functions";
import type { ServiceRow } from "@/lib/catalog.server";
import { formatAud } from "@/lib/format";

const servicesQuery = queryOptions({
  queryKey: ["services"],
  queryFn: () => getServices(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meridian Grove — Elite B2B Web Design & Corporate Consulting" },
      {
        name: "description",
        content:
          "A private marketplace of enterprise web development, UI/UX, brand strategy and technology consulting engagements. Request a secure corporate invoice — no public checkout.",
      },
      { property: "og:title", content: "Meridian Grove — Elite B2B Engagements" },
      {
        property: "og:description",
        content:
          "Browse premium enterprise engagements from $500 to $8,000 AUD and request a secure corporate proposal and invoice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(servicesQuery),
  component: Marketplace,
});

const CATEGORIES = [
  { value: "all", label: "All engagements" },
  { value: "web_development", label: "Web Development" },
  { value: "ui_ux_design", label: "UI / UX Design" },
  { value: "brand_strategy", label: "Brand Strategy" },
  { value: "tech_consulting", label: "Tech Consulting" },
] as const;

const TIER_FILTERS = [
  { value: "all", label: "All tiers" },
  { value: "Introductory", label: "Introductory ($500)" },
  { value: "premium", label: "Premium & Enterprise" },
] as const;

function ServiceCard({ service, onRequest }: { service: ServiceRow; onRequest: () => void }) {
  return (
    <article className="group flex flex-col rounded-lg border border-border/70 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-elevated">
      <div className="flex items-center justify-between">
        <span className="rounded-sm border border-gold/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
          {service.tier}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" />
          {service.project_timeline}
        </span>
      </div>

      <h3 className="mt-5 text-xl leading-snug text-foreground">{service.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{service.description}</p>

      <ul className="mt-6 space-y-2.5 border-t border-border/60 pt-5">
        {service.deliverables.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-gold" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7 flex items-end justify-between border-t border-border/60 pt-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Fixed engagement fee
          </p>
          <p className="font-display text-3xl text-foreground">
            {formatAud(service.price)}{" "}
            <span className="font-sans text-xs tracking-widest text-muted-foreground">AUD</span>
          </p>
        </div>
        {service.status === "booked" ? (
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Booked</span>
        ) : null}
      </div>

      <Button
        variant="executive"
        size="lg"
        className="mt-6 w-full"
        onClick={onRequest}
        disabled={service.status === "booked"}
      >
        <Lock className="size-4" />
        Request Secure Proposal &amp; Invoice
      </Button>
    </article>
  );
}

function Marketplace() {
  const { data: services } = useSuspenseQuery(servicesQuery);
  const [category, setCategory] = useState<string>("all");
  const [tier, setTier] = useState<string>("all");
  const [selected, setSelected] = useState<ServiceRow | null>(null);

  const filtered = useMemo(
    () =>
      services.filter((service) => {
        const matchesCategory = category === "all" || service.category === category;
        const matchesTier =
          tier === "all" ||
          (tier === "Introductory"
            ? service.tier === "Introductory"
            : service.tier !== "Introductory");
        return matchesCategory && matchesTier;
      }),
    [services, category, tier],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="#top" className="flex items-center gap-3">
            <Landmark className="size-5 text-gold" />
            <span className="font-display text-lg tracking-wide">Meridian Grove</span>
          </a>
          <div className="hidden items-center gap-9 text-sm text-muted-foreground md:flex">
            <a href="#engagements" className="transition-colors hover:text-foreground">
              Engagements
            </a>
            <a href="#practices" className="transition-colors hover:text-foreground">
              Practices
            </a>
            <a href="#assurance" className="transition-colors hover:text-foreground">
              Assurance
            </a>
          </div>
          <Button variant="hairline" size="sm" asChild>
            <a href="#engagements">
              View catalogue <ArrowUpRight className="size-4" />
            </a>
          </Button>
        </nav>
      </header>

      <main id="top">
        <section className="hero-surface border-b border-border/60">
          <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-gold">
              <BadgeCheck className="size-4" /> Invitation-only corporate practice
            </p>
            <h1 className="mt-7 max-w-4xl text-4xl leading-[1.08] md:text-6xl">
              Elite B2B web design and{" "}
              <span className="text-gradient-gold">corporate consulting</span> for organisations
              that cannot afford to get it wrong.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Board-ready engagements delivered by executive practice partners. Select a programme,
              request a proposal, and receive a secure corporate invoice by email — no public
              checkout, no card details entered on this site.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button variant="executive" size="lg" asChild>
                <a href="#engagements">Browse the engagement catalogue</a>
              </Button>
              <Button variant="hairline" size="lg" asChild>
                <a href="#assurance">How secure invoicing works</a>
              </Button>
            </div>

            <dl
              id="practices"
              className="mt-20 grid gap-10 border-t border-border/60 pt-10 sm:grid-cols-3"
            >
              {[
                { icon: Building2, k: "60", v: "Corporate engagements catalogued" },
                { icon: Globe2, k: "4", v: "Executive practice areas" },
                { icon: ShieldCheck, k: "100%", v: "Invoices issued off-site, server-side" },
              ].map(({ icon: Icon, k, v }) => (
                <div key={v}>
                  <Icon className="size-5 text-gold" />
                  <dt className="mt-4 font-display text-3xl">{k}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="engagements" className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl">The engagement catalogue</h2>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                {filtered.length} engagements available across our four executive practices, from
                introductory diagnostics to full enterprise programmes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIER_FILTERS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTier(option.value)}
                  className={`rounded-sm border px-4 py-2 text-xs uppercase tracking-[0.12em] transition-colors ${
                    tier === option.value
                      ? "border-gold/60 bg-gold/10 text-gold"
                      : "border-border/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 border-y border-border/60 py-5">
            {CATEGORIES.map((option) => (
              <button
                key={option.value}
                onClick={() => setCategory(option.value)}
                className={`rounded-sm px-4 py-2 text-sm transition-colors ${
                  category === option.value
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onRequest={() => setSelected(service)}
              />
            ))}
          </div>
        </section>

        <section id="assurance" className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <h2 className="text-3xl md:text-4xl">A low-risk invoicing workflow</h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Request a proposal",
                  body: "Share your name, corporate email and company. Nothing sensitive is collected and no payment form is loaded.",
                },
                {
                  step: "02",
                  title: "Server-side invoice issuance",
                  body: "Our backend creates your corporate customer record and invoice through credentials that never touch the browser.",
                },
                {
                  step: "03",
                  title: "Pay on the secure portal",
                  body: "The invoice email arrives directly from our payment provider's servers, with a hosted portal for settlement.",
                },
              ].map((item) => (
                <div key={item.step} className="border-t border-gold/30 pt-6">
                  <span className="font-display text-sm text-gold">{item.step}</span>
                  <h3 className="mt-3 text-xl">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <Landmark className="size-4 text-gold" /> Meridian Grove Corporate Practice
          </span>
          <span>All engagement fees quoted in AUD. Invoices payable within 14 days.</span>
        </div>
      </footer>

      <ProposalModal service={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
