import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestSecureProposal } from "@/lib/invoices.functions";
import { getPaymentsEnvironment } from "@/lib/payments-env";
import type { ServiceRow } from "@/lib/catalog.server";
import { formatAud } from "@/lib/format";

interface ProposalModalProps {
  service: ServiceRow | null;
  onOpenChange: (open: boolean) => void;
}

export function ProposalModal({ service, onOpenChange }: ProposalModalProps) {
  const navigate = useNavigate();
  const submit = useServerFn(requestSecureProposal);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service) return;

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();

    const nextErrors: Record<string, string> = {};
    if (fullName.length < 2 || fullName.length > 120)
      nextErrors["fullName"] = "Enter your full name (2-120 characters).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)
      nextErrors["email"] = "Enter a valid corporate email address.";
    if (company.length < 2 || company.length > 160)
      nextErrors["company"] = "Enter your company name (2-160 characters).";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await submit({
        data: {
          serviceId: service.id,
          fullName,
          email,
          company,
          environment: getPaymentsEnvironment(),
        },
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onOpenChange(false);
      navigate({ to: "/proposal-sent" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send your proposal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!service} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/70 bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Request secure proposal</DialogTitle>
          <DialogDescription>
            {service ? (
              <>
                <span className="text-foreground">{service.title}</span> —{" "}
                <span className="text-gold">{formatAud(service.price)} AUD</span>. We issue your
                invoice through our corporate billing portal. No card details are entered on this
                site.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" maxLength={120} autoComplete="name" required />
            {errors["fullName"] ? (
              <p className="text-xs text-destructive">{errors["fullName"]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Corporate email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              maxLength={255}
              autoComplete="email"
              required
            />
            {errors["email"] ? <p className="text-xs text-destructive">{errors["email"]}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company name</Label>
            <Input
              id="company"
              name="company"
              maxLength={160}
              autoComplete="organization"
              required
            />
            {errors["company"] ? (
              <p className="text-xs text-destructive">{errors["company"]}</p>
            ) : null}
          </div>

          <p className="flex items-start gap-2 rounded-md border border-border/70 bg-secondary/50 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
            Your invoice is generated server-side and emailed directly from our payment provider's
            secure infrastructure. This site never handles card data.
          </p>

          <Button type="submit" variant="executive" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Issuing secure invoice…
              </>
            ) : (
              "Send my proposal & invoice"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}