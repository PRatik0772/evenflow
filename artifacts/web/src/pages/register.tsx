import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthRegister, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Ticket, Check, Users, BarChart3 } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["attendee", "organiser"]),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "You must accept the terms to create an account." }) }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const register = useAuthRegister();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "attendee",
      termsAccepted: false as unknown as true,
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    register.mutate(
      { data },
      {
        onSuccess: (user) => {
          queryClient.setQueryData(getAuthMeQueryKey(), user);
          toast({
            title: "Account created",
            description: "Welcome to EventFlow!",
          });
          setLocation(user.role === 'organiser' ? "/dashboard" : "/");
        },
        onError: (error) => {
          toast({
            title: "Registration failed",
            description: (error.data as any)?.error || "An error occurred while creating your account.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-1 min-h-[calc(100vh-64px)]">
      {/* Left Panel - Hidden on mobile */}
      <div className="relative hidden md:flex w-1/2 bg-gradient-to-br from-purple-600 via-violet-500 to-indigo-500 p-12 flex-col items-center justify-center text-white overflow-hidden">
        {/* Floating decorative circles */}
        <div className="absolute top-12 left-12 w-24 h-24 rounded-full bg-white/10 animate-float" />
        <div className="absolute bottom-20 right-16 w-16 h-16 rounded-full bg-white/15 animate-float-slow delay-300" />
        <div className="absolute top-1/2 right-8 w-10 h-10 rounded-xl bg-white/10 rotate-12 animate-float delay-200" />
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-12 text-center max-w-md w-full">
          <Ticket className="h-16 w-16 text-white/80 mb-6" />
          <h2 className="text-3xl font-bold mb-3 tracking-tight">EventFlow</h2>
          <p className="text-slate-300 text-base mb-12 max-w-xs leading-relaxed">
            Join thousands of event organisers and attendees across Australia.
          </p>

          <div className="space-y-5 text-left w-full max-w-sm">
            <div className="flex items-center gap-3 text-slate-200 font-medium">
              <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
              Discover amazing local events
            </div>
            <div className="flex items-center gap-3 text-slate-200 font-medium">
              <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
              Secure and fast checkout
            </div>
            <div className="flex items-center gap-3 text-slate-200 font-medium">
              <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
              Powerful tools for organisers
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto animate-fadeInRight">
        <div className="w-full max-w-md space-y-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-2">Get started with EventFlow today</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-foreground font-medium">I want to...</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-4">
                        <div 
                          className={`rounded-xl border-2 p-4 cursor-pointer hover:scale-[1.02] transition-transform ${
                            field.value === 'attendee' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-slate-200 hover:border-primary/50'
                          }`}
                          onClick={() => field.onChange('attendee')}
                        >
                          <Users className={`h-6 w-6 mb-3 ${field.value === 'attendee' ? 'text-primary' : 'text-slate-400'}`} />
                          <div className="font-semibold text-sm mb-1">Attend Events</div>
                          <div className="text-xs text-muted-foreground">Buy and manage your tickets</div>
                        </div>
                        <div 
                          className={`rounded-xl border-2 p-4 cursor-pointer hover:scale-[1.02] transition-transform ${
                            field.value === 'organiser' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-slate-200 hover:border-primary/50'
                          }`}
                          onClick={() => field.onChange('organiser')}
                        >
                          <BarChart3 className={`h-6 w-6 mb-3 ${field.value === 'organiser' ? 'text-primary' : 'text-slate-400'}`} />
                          <div className="font-semibold text-sm mb-1">Organise</div>
                          <div className="text-xs text-muted-foreground">Create and manage events</div>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Jane Doe" 
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
              
              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="termsAccepted"
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="termsAccepted" className="text-sm text-slate-600 cursor-pointer leading-snug">
                        I agree to the{" "}
                        <Link href="/terms" className="text-primary font-medium hover:underline" target="_blank">Terms of Service</Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-primary font-medium hover:underline" target="_blank">Privacy Policy</Link>.
                      </label>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11 rounded-lg font-medium bg-primary hover:bg-primary/90 mt-6" disabled={register.isPending}>
                {register.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm text-muted-foreground pt-4 border-t border-slate-100">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}