import { Github, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";

import SectionContainer from "../ui/SectionContainer";

const GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/product" },
      { label: "Pricing", href: "/pricing" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/product" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

const SOCIALS = [
  { icon: Twitter, label: "X", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Github, label: "GitHub", href: "#" },
];

export default function Footer() {
  return (
    <footer className="border-t border-default bg-panel backdrop-blur-xl">
      <SectionContainer className="py-12">
        <div className="grid gap-9 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">so</span>
              Summora
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted">
              Turn long meetings and lectures into searchable transcripts and actionable summaries.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-semibold text-foreground">{group.title}</p>
                <div className="mt-3 grid gap-2">
                  {group.links.map((link) => (
                    <Link key={link.label} to={link.href} className="text-sm text-muted transition hover:text-foreground">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <p className="text-sm font-semibold text-foreground">Social</p>
              <div className="mt-3 grid gap-2">
                {SOCIALS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a key={item.label} href={item.href} className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-default pt-6 text-sm text-muted">
          © {new Date().getFullYear()} Summora, Inc. All rights reserved.
        </div>
      </SectionContainer>
    </footer>
  );
}
