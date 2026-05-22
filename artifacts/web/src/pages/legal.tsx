import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mb-8">{title}</h1>
        <div className="prose prose-slate max-w-none space-y-4 text-slate-700 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Terms() {
  return (
    <LegalShell title="Terms of Service">
      <p>By using EventFlow you agree to the following terms. This is a draft of our terms; please contact us for the current version.</p>
      <h2 className="text-xl font-semibold mt-6">1. Accounts</h2>
      <p>You are responsible for the accuracy of the information you provide and for keeping your password secure.</p>
      <h2 className="text-xl font-semibold mt-6">2. Tickets and refunds</h2>
      <p>Refunds are at the organiser's discretion. EventFlow facilitates the transaction but is not responsible for the event itself.</p>
      <h2 className="text-xl font-semibold mt-6">3. Acceptable use</h2>
      <p>Do not use EventFlow for unlawful purposes or to deceive other users.</p>
      <h2 className="text-xl font-semibold mt-6">4. Liability</h2>
      <p>EventFlow is provided "as is" without warranty. Our liability is limited to the fees you have paid us.</p>
    </LegalShell>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Privacy Policy">
      <p>We respect your privacy. This page describes how we collect and use your information.</p>
      <h2 className="text-xl font-semibold mt-6">Information we collect</h2>
      <p>Your name, email, and order history. Payment information is processed by Stripe and never stored on our servers.</p>
      <h2 className="text-xl font-semibold mt-6">How we use it</h2>
      <p>To deliver your tickets, contact you about your orders, and improve the service. We do not sell your data.</p>
      <h2 className="text-xl font-semibold mt-6">Your rights</h2>
      <p>You can request a copy of your data or deletion of your account by contacting us.</p>
    </LegalShell>
  );
}
