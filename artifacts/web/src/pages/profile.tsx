import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthMe, getAuthMeQueryKey, useUpdateProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, User } from "lucide-react";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export default function Profile() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading } = useAuthMe({ query: { queryKey: getAuthMeQueryKey() } });
  const queryClient = useQueryClient();
  const update = useUpdateProfile();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  });

  useEffect(() => {
    if (user) form.reset({ name: user.name, email: user.email });
  }, [user, form]);

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) {
    setLocation("/login");
    return null;
  }

  const onSubmit = (data: FormValues) => {
    update.mutate({ data }, {
      onSuccess: (u) => {
        queryClient.setQueryData(getAuthMeQueryKey(), u);
        toast({ title: "Profile updated" });
      },
      onError: (err) => {
        toast({ title: "Update failed", description: (err.data as any)?.error || "Try again", variant: "destructive" });
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl flex-1">
      <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <User className="h-5 w-5" />
        </div>
        Profile
      </h1>
      <p className="text-muted-foreground mb-8">Update your account details.</p>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-slate-700">Full name</FormLabel>
                  <FormControl><Input className="rounded-xl h-11" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-slate-700">Email</FormLabel>
                  <FormControl><Input type="email" className="rounded-xl h-11" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="text-sm text-slate-500 pt-2">
              <span className="font-medium text-slate-700">Role:</span> {user.role}
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" className="rounded-xl h-11 px-6" disabled={update.isPending}>
                {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
