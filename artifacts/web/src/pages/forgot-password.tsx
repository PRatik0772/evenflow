import { useState } from "react";
import { Link } from "wouter";
import { Loader2, Ticket, ArrowLeft, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Something went wrong", variant: "destructive" });
      } else {
        setSent(true);
      }
    } catch {
      toast({ title: "Network error", description: "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-[calc(100vh-64px)]">
      <div className="relative hidden md:flex w-1/2 bg-gradient-to-br from-violet-600 via-indigo-500 to-blue-500 p-12 flex-col items-center justify-center text-white overflow-hidden">
        <div className="absolute top-12 left-12 w-24 h-24 rounded-full bg-white/10 animate-float" />
        <div className="absolute bottom-20 right-16 w-16 h-16 rounded-full bg-white/15 animate-float-slow delay-300" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-12 text-center max-w-md w-full">
          <Ticket className="h-16 w-16 text-white/80 mb-6" />
          <h2 className="text-3xl font-bold mb-3 tracking-tight">EventFlow</h2>
          <p className="text-slate-300 text-base max-w-xs leading-relaxed">
            We'll send you a secure link to reset your password.
          </p>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white animate-fadeInRight">
        <div className="w-full max-w-sm space-y-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-14 w-14 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                If <strong>{email}</strong> is registered, you'll receive a reset link within a minute.
                The link expires after 60 minutes.
              </p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Forgot password?</h1>
                <p className="text-sm text-muted-foreground mt-2">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="rounded-lg border-slate-200 focus-visible:ring-primary h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 rounded-lg font-medium bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-indigo-200 transition-all"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground pt-4">
                <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
