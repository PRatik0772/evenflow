import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuthMe, useAuthLogout, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, LogOut, Loader2, QrCode, LayoutDashboard, CalendarDays, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useAuthMe({ query: { queryKey: getAuthMeQueryKey() } });
  const logout = useAuthLogout();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
        setLocation("/login");
      }
    });
  };

  const scanMatch = location.match(/^\/dashboard\/events\/([^/]+)(?:\/(?!edit|scan|new))?$/);
  const scanEventId = scanMatch?.[1];
  const showScanLink = scanEventId && scanEventId !== "new";

  const navLink = (href: string, label: string, icon: React.ReactNode, exact = false) => {
    const active = exact ? location === href : location.startsWith(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
          active
            ? "bg-gray-100 text-gray-900"
            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        {icon}
        {label}
      </Link>
    );
  };

  const mobileNavLink = (href: string, label: string, icon: React.ReactNode, exact = false) => {
    const active = exact ? location === href : location.startsWith(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
          active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <span className={active ? "text-gray-900" : "text-gray-400"}>{icon}</span>
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-[100dvh]" style={{ background: "#FDFDFC" }}>
      {/* Aurora Top Nav */}
      <nav
        className="flex items-center justify-between px-4 sm:px-6 py-3 sticky top-0 z-40"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
        }}
      >
        {/* Left: Logo + nav links */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <img src="/favicon.svg" alt="EventFlow" className="w-8 h-8 rounded-lg shadow-sm" />
            <span className="aurora-heading text-xl text-gray-900 leading-none mt-0.5">EventFlow</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLink("/dashboard", "Dashboard", <LayoutDashboard className="h-3.5 w-3.5" />, true)}
            {navLink("/dashboard/events", "My Events", <CalendarDays className="h-3.5 w-3.5" />)}
            {showScanLink && navLink(
              `/dashboard/events/${scanEventId}/scan`,
              "Door Check-In",
              <QrCode className="h-3.5 w-3.5" />
            )}
          </div>
        </div>

        {/* Right: Create Event + user avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/events/new"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:text-white relative overflow-hidden group transition-all duration-200"
          >
            <span className="absolute inset-0 aurora-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <Plus className="h-3.5 w-3.5 relative z-10" />
            <span className="relative z-10">Create Event</span>
          </Link>

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 focus:outline-none group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm aurora-gradient">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                    {user.name.split(" ")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border border-gray-100">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-gray-400 font-normal truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation('/dashboard')} className="cursor-pointer">
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/dashboard/events')} className="cursor-pointer">
                  My Events
                </DropdownMenuItem>
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
          ) : null}
        </div>
      </nav>

      {/* Mobile slide-in drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <img src="/favicon.svg" alt="EventFlow" className="w-7 h-7 rounded-lg shadow-sm" />
                <span className="aurora-heading text-lg text-gray-900">EventFlow</span>
              </div>
              <button
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer nav */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {mobileNavLink("/dashboard", "Dashboard", <LayoutDashboard className="h-4 w-4" />, true)}
              {mobileNavLink("/dashboard/events", "My Events", <CalendarDays className="h-4 w-4" />)}
              {showScanLink && mobileNavLink(
                `/dashboard/events/${scanEventId}/scan`,
                "Door Check-In",
                <QrCode className="h-4 w-4" />
              )}
            </div>

            {/* Drawer footer */}
            <div className="px-3 pb-6 pt-3 border-t border-gray-100 space-y-2">
              <Link
                href="/dashboard/events/new"
                className="flex items-center justify-center gap-2 w-full py-3 aurora-gradient text-white text-sm font-medium rounded-2xl hover:opacity-90 transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus className="h-4 w-4" /> Create Event
              </Link>
              {user && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full aurora-gradient flex items-center justify-center text-white text-sm font-semibold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
