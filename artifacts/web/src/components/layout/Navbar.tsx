import { Link, useLocation } from "wouter";
import { useAuthMe, useAuthLogout, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { LogOut, Loader2, QrCode, LayoutDashboard } from "lucide-react";

export function Navbar() {
  const { data: user, isLoading } = useAuthMe({ query: { queryKey: getAuthMeQueryKey() } });
  const logout = useAuthLogout();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
        setLocation("/login");
      }
    });
  };

  return (
    <header
      className="h-16 sticky top-0 z-50 shrink-0"
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="EventFlow" className="w-8 h-8 rounded-lg shadow-sm" />
            <span className="aurora-heading text-xl text-gray-900 leading-none mt-0.5">EventFlow</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-all"
            >
              Browse Events
            </Link>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-20 h-8 rounded-full animate-pulse bg-gray-100" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 focus:outline-none group">
                  <div className="w-8 h-8 rounded-full aurora-gradient flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                    {user.name.split(" ")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border border-gray-100">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-gray-400 font-normal">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === "organiser" && (
                  <DropdownMenuItem onClick={() => setLocation("/dashboard")} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Organiser Dashboard
                  </DropdownMenuItem>
                )}
                {(user.role === "attendee" || user.role === "staff") && (
                  <DropdownMenuItem onClick={() => setLocation("/my-tickets")} className="cursor-pointer">
                    <QrCode className="mr-2 h-4 w-4" /> My Tickets
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-500 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                >
                  {logout.isPending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <LogOut className="mr-2 h-4 w-4" />}
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-500 hover:text-gray-900 px-4 py-2 rounded-full hover:bg-gray-50 transition-all"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-white px-5 py-2 rounded-full aurora-gradient hover:opacity-90 transition-opacity shadow-sm"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
