CREATE TABLE IF NOT EXISTS blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Novidades',
  cover_image_url TEXT,
  author_name TEXT NOT NULL DEFAULT 'Equipe PEDDI',
  author_role TEXT NOT NULL DEFAULT 'PEDDI',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  featured BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blog_articles_public ON blog_articles(status, published_at DESC);
