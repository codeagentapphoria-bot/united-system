-- Migration: 15_role_pages_table
-- Creates role_pages junction table for page-visibility RBAC
-- Seed data: super_admin and admin get ALL pages

CREATE TABLE public.role_pages (
  id         text NOT NULL DEFAULT gen_random_uuid()::text,
  role_id    text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  page_id    text NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  created_at timestamp without time zone DEFAULT now(),
  PRIMARY KEY (role_id, page_id)
);

-- Index for fast lookups
CREATE INDEX idx_role_pages_role_id ON public.role_pages(role_id);
CREATE INDEX idx_role_pages_page_id ON public.role_pages(page_id);

-- Seed: super_admin and admin get ALL pages
INSERT INTO public.role_pages (role_id, page_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.pages p
WHERE r.name IN ('role-super-admin', 'role-admin');
