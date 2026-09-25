import React from "react";

export default function AuthLayout({ icon: Icon, logoUrl, brandName, theme, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" style={theme ? { '--primary': theme.primaryHsl, '--ring': theme.primaryHsl, backgroundColor: theme.background, color: theme.text } : undefined}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className={logoUrl
            ? "mb-4 inline-flex h-28 w-60 max-w-full items-center justify-center"
            : "mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-black/5 shadow-sm"
          }>
            {logoUrl ? <img src={logoUrl} alt={`Logo ${brandName || 'da loja'}`} className="block h-full w-full object-contain object-center" /> : <Icon className="w-8 h-8 text-primary" aria-hidden="true" />}
          </div>
          {brandName && <p className="mb-2 text-sm font-semibold text-primary">{brandName}</p>}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
