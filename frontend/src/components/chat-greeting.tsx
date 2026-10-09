"use client";

import { authClient } from "auth/client";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

function getGreetingByTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 18) return "goodAfternoon";
  return "goodEvening";
}

export const ChatGreeting = () => {
  const { data: session } = authClient.useSession();
  const t = useTranslations("Chat.Greeting");
  const firstName = session?.user?.name?.split(" ")[0];

  // Time of day is client-only (server render would use the server's clock)
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => setKey(getGreetingByTime()), []);

  return (
    <motion.div
      key="welcome"
      className="mx-auto w-full max-w-3xl px-6"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex flex-col items-center gap-2 pb-8 text-center">
        <h1 className="min-h-[1.2em] text-[32px] font-semibold leading-tight tracking-[-0.03em] md:text-[40px]">
          {key && firstName ? t(key, { name: firstName }) : "Welcome to Askly"}
        </h1>
        <p className="text-[15px] text-muted-foreground">
          What are we studying today?
        </p>
      </div>
    </motion.div>
  );
};
