
CREATE TYPE public.service_category AS ENUM ('web_development','ui_ux_design','brand_strategy','tech_consulting');
CREATE TYPE public.service_status AS ENUM ('available','booked');

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.service_category NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) NOT NULL,
  tier text NOT NULL,
  project_timeline text NOT NULL,
  deliverables text[] NOT NULL DEFAULT '{}',
  status public.service_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service catalog is publicly viewable" ON public.services FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.invoice_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  email text,
  company text,
  stripe_invoice_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_requests_ip_time ON public.invoice_requests(ip_hash, created_at DESC);
GRANT ALL ON public.invoice_requests TO service_role;
ALTER TABLE public.invoice_requests ENABLE ROW LEVEL SECURITY;

WITH raw(cat, title, price, tier, timeline) AS (VALUES
 ('web_development','Enterprise SaaS Platform Re-Architecture',7800,'Enterprise','16 weeks'),
 ('web_development','Full-Scale Custom E-commerce Infrastructure',7400,'Enterprise','14 weeks'),
 ('web_development','Headless Commerce Migration Program',6900,'Enterprise','12 weeks'),
 ('web_development','Corporate Investor Relations Portal',5200,'Premium','9 weeks'),
 ('web_development','Multi-Region Web Performance Overhaul',4800,'Premium','8 weeks'),
 ('web_development','Secure Client Portal & Document Vault',6100,'Enterprise','11 weeks'),
 ('web_development','Design System Component Library Build',4300,'Premium','7 weeks'),
 ('web_development','Progressive Web App Transformation',5600,'Premium','10 weeks'),
 ('web_development','Enterprise CMS Consolidation Program',7100,'Enterprise','13 weeks'),
 ('web_development','API Gateway & Integration Layer Build',6500,'Enterprise','11 weeks'),
 ('web_development','Accessibility & WCAG 2.2 Remediation',3400,'Professional','5 weeks'),
 ('web_development','Global Multilingual Rollout Engineering',5900,'Premium','10 weeks'),
 ('web_development','Real-Time Analytics Dashboard Suite',4600,'Premium','8 weeks'),
 ('ui_ux_design','Enterprise SaaS Product Redesign',7600,'Enterprise','14 weeks'),
 ('ui_ux_design','Executive Dashboard Experience Design',5100,'Premium','8 weeks'),
 ('ui_ux_design','End-to-End Customer Journey Mapping',3900,'Professional','6 weeks'),
 ('ui_ux_design','Corporate Design System Foundations',6300,'Enterprise','11 weeks'),
 ('ui_ux_design','Conversion Rate Optimisation Programme',4400,'Premium','7 weeks'),
 ('ui_ux_design','Enterprise Mobile App Experience Redesign',7200,'Enterprise','13 weeks'),
 ('ui_ux_design','B2B Onboarding Flow Reinvention',3600,'Professional','5 weeks'),
 ('ui_ux_design','Usability Research & Stakeholder Testing Lab',3200,'Professional','4 weeks'),
 ('ui_ux_design','Data Visualisation Language Development',4900,'Premium','8 weeks'),
 ('ui_ux_design','Service Blueprint & Operations Design',5400,'Premium','9 weeks'),
 ('ui_ux_design','Enterprise Accessibility Experience Audit',3100,'Professional','4 weeks'),
 ('ui_ux_design','Premium Marketplace Interface Design',6700,'Enterprise','12 weeks'),
 ('brand_strategy','Corporate Rebrand & Identity Architecture',7900,'Enterprise','15 weeks'),
 ('brand_strategy','Executive Positioning & Narrative Strategy',5800,'Premium','10 weeks'),
 ('brand_strategy','Category Leadership Messaging Framework',4700,'Premium','8 weeks'),
 ('brand_strategy','B2B Go-To-Market Launch Strategy',6200,'Enterprise','11 weeks'),
 ('brand_strategy','Merger & Acquisition Brand Integration',7500,'Enterprise','14 weeks'),
 ('brand_strategy','Investor Deck & Capital Narrative Programme',3800,'Professional','6 weeks'),
 ('brand_strategy','Corporate Tone of Voice & Content Standards',3300,'Professional','5 weeks'),
 ('brand_strategy','Employer Brand & Talent Attraction Strategy',4100,'Premium','7 weeks'),
 ('brand_strategy','Competitive Intelligence & Market Study',3500,'Professional','5 weeks'),
 ('brand_strategy','Global Brand Governance Playbook',5300,'Premium','9 weeks'),
 ('brand_strategy','Premium Sub-Brand Architecture Programme',6600,'Enterprise','12 weeks'),
 ('brand_strategy','3-Month Strategic Growth Retainer',6800,'Enterprise','12 weeks'),
 ('tech_consulting','Cloud Architecture Migration Programme',7700,'Enterprise','15 weeks'),
 ('tech_consulting','Enterprise Security & Compliance Readiness',7000,'Enterprise','12 weeks'),
 ('tech_consulting','Legacy System Modernisation Roadmap',6400,'Enterprise','11 weeks'),
 ('tech_consulting','Data Platform & Warehouse Strategy',5700,'Premium','10 weeks'),
 ('tech_consulting','AI Adoption & Governance Advisory',6000,'Enterprise','10 weeks'),
 ('tech_consulting','DevOps & Delivery Pipeline Transformation',5000,'Premium','8 weeks'),
 ('tech_consulting','Technical Due Diligence for Acquisition',4200,'Premium','6 weeks'),
 ('tech_consulting','Fractional CTO Advisory Retainer',5500,'Premium','12 weeks'),
 ('tech_consulting','Cost Optimisation & Cloud FinOps Review',3700,'Professional','5 weeks'),
 ('tech_consulting','Enterprise Integration Strategy Blueprint',4500,'Premium','7 weeks'),
 ('tech_consulting','Disaster Recovery & Resilience Programme',4000,'Premium','6 weeks'),
 ('tech_consulting','Zero-Trust Access Architecture Design',6100,'Enterprise','10 weeks'),
 ('tech_consulting','Engineering Org Scale-Up Advisory',3000,'Professional','4 weeks')
)
INSERT INTO public.services (category, title, description, price, tier, project_timeline, deliverables)
SELECT cat::public.service_category,
       title,
       title || ' — a fully managed engagement led by our executive practice partners, scoped with enterprise governance, security review and board-level reporting throughout delivery.',
       price,
       tier,
       timeline,
       CASE cat
         WHEN 'web_development' THEN ARRAY['Technical discovery & architecture blueprint','Production build with CI/CD pipeline','Performance, security & load hardening','30-day post-launch engineering support']
         WHEN 'ui_ux_design' THEN ARRAY['Stakeholder research & experience audit','High-fidelity design system','Interactive executive prototype','Developer handoff documentation']
         WHEN 'brand_strategy' THEN ARRAY['Market & competitor positioning study','Brand narrative and messaging framework','Executive brand guidelines','Rollout and launch playbook']
         ELSE ARRAY['Current-state architecture assessment','Target-state roadmap & TCO model','Implementation governance plan','Executive advisory sessions']
       END
FROM raw;

WITH intro(cat, title) AS (VALUES
 ('web_development','Corporate Landing Page Sprint'),
 ('web_development','Website Performance Diagnostic'),
 ('web_development','Analytics & Tracking Implementation'),
 ('ui_ux_design','Executive UX Review Session'),
 ('ui_ux_design','Brand-Aligned Interface Refresh'),
 ('ui_ux_design','Conversion Audit Starter'),
 ('brand_strategy','Positioning Discovery Workshop'),
 ('brand_strategy','Messaging Starter Framework'),
 ('tech_consulting','Technology Stack Health Check'),
 ('tech_consulting','Cloud Readiness Assessment')
)
INSERT INTO public.services (category, title, description, price, tier, project_timeline, deliverables)
SELECT cat::public.service_category,
       title,
       title || ' — an introductory engagement designed to establish scope, surface quick wins and align your leadership team before a full-scale programme.',
       500,
       'Introductory',
       '2 weeks',
       ARRAY['Executive kickoff call','Focused audit of current state','Prioritised recommendations document','Scoping call for full engagement']
FROM intro;
