"use client";

import { appStore } from "@/app/store";
import { getLocaleAction } from "@/i18n/get-locale";
import { authClient } from "auth/client";
import { Session, User as UserType } from "better-auth";
import { COOKIE_KEY_LOCALE, SUPPORTED_LOCALES } from "lib/const";
import {
  ChevronsUpDown,
  Command,
  CreditCard,
  Languages,
  LogOutIcon,
  Settings2,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import useSWR from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { GithubIcon } from "ui/github-icon";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "ui/sidebar";
import { ThemeSwitch } from "./theme-switch";

export function AppSidebarUser({
  session,
}: { session?: { session: Session; user: UserType } }) {
  const appStoreMutate = appStore((state) => state.mutate);
  const t = useTranslations("Layout");
  const router = useRouter();

  const user = session?.user;

  const logout = () => {
    authClient.signOut().finally(() => {
      window.location.href = "/sign-in";
    });
  };

  useSWR(
    "/session-update",
    () =>
      authClient.getSession().then(() => {
        console.log(`session-update: ${new Date().toISOString()}`);
      }),
    {
      refreshIntervalOnFocus: false,
      focusThrottleInterval: 1000 * 60 * 5,
      revalidateOnFocus: false,
      refreshWhenHidden: true,
      refreshInterval: 1000 * 60 * 5,
    },
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="h-auto gap-2.5 px-2 py-2 data-[state=open]:bg-sidebar-accent"
              data-testid="sidebar-user-button"
            >
              <Avatar className="size-7 rounded-full">
                <AvatarImage
                  className="object-cover"
                  src={user?.image || "/pf.png"}
                  alt={user?.name || ""}
                />
                <AvatarFallback>{user?.name?.slice(0, 1) || ""}</AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate text-[13px] font-medium text-foreground">
                  {user?.name}
                </span>
                <span className="truncate text-[12px] text-muted-foreground">
                  {user?.email}
                </span>
              </span>
              <ChevronsUpDown className="ml-auto size-3.5! text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-xl"
            align="center"
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage
                    src={user?.image || "/pf.png"}
                    alt={user?.name || ""}
                  />
                  <AvatarFallback className="rounded-lg">
                    {user?.name?.slice(0, 1) || ""}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/profile")}
            >
              <User className="size-4 text-foreground" />
              <span>Profile</span>
            </DropdownMenuItem>
            {(user as { role?: string } | undefined)?.role === "student" && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => router.push("/billing")}
              >
                <CreditCard className="size-4 text-foreground" />
                <span>Billing</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => appStoreMutate({ openChatPreferences: true })}
            >
              <Settings2 className="size-4 text-foreground" />
              <span>{t("chatPreferences")}</span>
            </DropdownMenuItem>
            <SelectLanguage />
            <div className="px-2 pt-1.5 pb-1">
              <ThemeSwitch />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => appStoreMutate({ openShortcutsPopup: true })}
            >
              <Command className="size-4 text-foreground" />
              <span>{t("keyboardShortcuts")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                window.open(
                  "https://github.com/Tobbiloba/miva-hub/issues/new",
                  "_blank",
                );
              }}
            >
              <GithubIcon className="size-4 fill-foreground" />
              <span>{t("reportAnIssue")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer">
              <LogOutIcon className="size-4 text-foreground" />
              <span>{t("signOut")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function SelectLanguage() {
  const t = useTranslations("Layout");
  const { data: currentLocale } = useSWR(COOKIE_KEY_LOCALE, getLocaleAction, {
    fallbackData: SUPPORTED_LOCALES[0].code,
    revalidateOnFocus: false,
  });
  const handleOnChange = useCallback((locale: string) => {
    document.cookie = `${COOKIE_KEY_LOCALE}=${locale}; path=/;`;
    window.location.reload();
  }, []);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages className="mr-2 size-4" />
        <span>{t("language")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="w-48 max-h-96 overflow-y-auto">
          <DropdownMenuLabel className="text-muted-foreground">
            {t("language")}
          </DropdownMenuLabel>
          {SUPPORTED_LOCALES.map((locale) => (
            <DropdownMenuCheckboxItem
              key={locale.code}
              checked={locale.code === currentLocale}
              onCheckedChange={() =>
                locale.code !== currentLocale && handleOnChange(locale.code)
              }
            >
              {locale.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
