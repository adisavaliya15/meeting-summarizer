import { Link } from "react-router-dom";

import SectionContainer from "../ui/SectionContainer";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white/80 py-12 dark:border-slate-800 dark:bg-slate-950/80">
      <SectionContainer>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold text-brand-600 dark:text-brand-200">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">SO</span>
              Summora
            </Link>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              AI meeting summaries with chunked recording, transcription, and final brief generation.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Product</h4>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Link to="/product" className="hover:text-brand-600 dark:hover:text-brand-300">Features</Link>
              <Link to="/pricing" className="hover:text-brand-600 dark:hover:text-brand-300">Pricing</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Company</h4>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Link to="/product" className="hover:text-brand-600 dark:hover:text-brand-300">About</Link>
              <Link to="/contact" className="hover:text-brand-600 dark:hover:text-brand-300">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Legal</h4>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <a href="#" className="hover:text-brand-600 dark:hover:text-brand-300">Privacy</a>
              <a href="#" className="hover:text-brand-600 dark:hover:text-brand-300">Terms</a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Social</h4>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <a href="#" className="hover:text-brand-600 dark:hover:text-brand-300">X</a>
              <a href="#" className="hover:text-brand-600 dark:hover:text-brand-300">LinkedIn</a>
              <a href="#" className="hover:text-brand-600 dark:hover:text-brand-300">GitHub</a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          © {new Date().getFullYear()} Summora. All rights reserved.
        </div>
      </SectionContainer>
    </footer>
  );
}
