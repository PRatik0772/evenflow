import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthLogin, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Ticket, Check } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const login = useAuthLogin();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    login.mutate(
      { data },
      {
        onSuccess: (user) => {
          queryClient.setQueryData(getAuthMeQueryKey(), user);
          toast({
            title: "Welcome back",
            description: "You have successfully signed in.",
          });
          if (user.role === 'organiser') {
            setLocation("/dashboard");
          } else {
            setLocation("/");
          }
        },
        onError: (error) => {
          toast({
            title: "Sign in failed",
            description: (error.data as any)?.error || "Please check your credentials and try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-1 min-h-[calc(100vh-64px)]">
      {/* Left Panel - Hidden on mobile */}
      <div className="relative hidden md:flex w-1/2 bg-gradient-to-br from-violet-600 via-indigo-500 to-blue-500 p-12 flex-col items-center justify-center text-white overflow-hidden">
        {/* Floating decorative circles */}
        <div className="absolute top-12 left-12 w-24 h-24 rounded-full bg-white/10 animate-float" />
        <div className="absolute bottom-20 right-16 w-16 h-16 rounded-full bg-white/15 animate-float-slow delay-300" />
        <div className="absolute top-1/2 right-8 w-10 h-10 rounded-xl bg-white/10 rotate-12 animate-float delay-200" />
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-12 text-center max-w-md w-full">
          <Ticket className="h-16 w-16 text-white/80 mb-6" />
          <h2 className="text-3xl font-bold mb-3 tracking-tight">EventFlow</h2>
          <p className="text-slate-300 text-base mb-12 max-w-xs leading-relaxed">
            The smarter way to manage and attend events in Australia.
          </p>

          <div className="space-y-5 text-left w-full max-w-sm">
            <div className="flex items-center gap-3 text-slate-200 font-medium">
              <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
              Seamless ticket management
            </div>
            <div className="flex items-center gap-3 text-slate-200 font-medium">
              <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
              Real-time attendee insights
            </div>
            <div className="flex items-center gap-3 text-slate-200 font-medium">
              <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
              Instant QR scanning at the door
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white animate-fadeInRight">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-2">Sign in to your EventFlow account</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="name@example.com" 
                        type="email" 
                        className="rounded-lg border-slate-200 focus-visible:ring-primary h-11" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Password</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="••••••••" 
                        type="password" 
                        className="rounded-lg border-slate-200 focus-visible:ring-primary h-11" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-11 rounded-lg font-medium bg-primary hover:bg-primary/90 mt-2 hover:shadow-lg hover:shadow-indigo-200 transition-all" disabled={login.isPending}>
                {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>

          <div className="text-center pt-2">
            <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary hover:underline">
              Forgot your password?
            </Link>
          </div>

          <div className="text-center text-sm text-muted-foreground pt-2">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}