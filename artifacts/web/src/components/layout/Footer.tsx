import { Link } from "wouter";
import { Ticket, Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Ticket className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-slate-700">EventFlow</span>
            <span className="text-slate-400">— Event ticketing for Australia</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <Shield className="h-3.5 w-3.5" />
              <span>Secure checkout by Stripe</span>
            </div>
            <Link href="/terms" className="text-slate-500 hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-slate-500 hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/find-tickets" className="text-slate-500 hover:text-foreground transition-colors">
              Find my tickets
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
