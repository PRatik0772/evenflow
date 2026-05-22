import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Loader2, Ticket, CheckCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(!token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "At least 8 characters required.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", description: "Please re-enter the same password.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400) {
          setInvalid(true);
        } else {
          toast({ title: "Error", description: data.error || "Something went wrong", variant: "destructive" });
        }
      } else {
        setDone(true);
        setTimeout(() => setLocation("/login"), 3000);
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
            Choose a strong password to keep your account secure.
          </p>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white animate-fadeInRight">
        <div className="w-full max-w-sm space-y-8">
          {invalid ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-14 w-14 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Link expired</h1>
              <p className="text-sm text-muted-foreground">
                This password reset link is invalid or has already been used. Please request a new one.
              </p>
              <Link href="/forgot-password" className="inline-block text-sm font-semibold text-primary hover:underline">
                Request new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-14 w-14 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Password updated!</h1>
              <p className="text-sm text-muted-foreground">
                Your password has been changed. Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Set new password</h1>
                <p className="text-sm text-muted-foreground mt-2">Must be at least 8 characters.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="rounded-lg border-slate-200 focus-visible:ring-primary h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-foreground font-medium">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    className="rounded-lg border-slate-200 focus-visible:ring-primary h-11"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 rounded-lg font-medium bg-primary hover:bg-primary/90 hover:shadow-lg hover:shadow-indigo-200 transition-all"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Set New Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
