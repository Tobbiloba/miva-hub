import { appStore } from "@/app/store";
import { fetcher } from "lib/utils";
import useSWR from "swr";

export const useChatModels = () => {
  return useSWR<
    {
      provider: string;
      hasAPIKey: boolean;
      models: {
        name: string;
        isToolCallUnsupported: boolean;
      }[];
    }[]
  >("/api/chat/models", fetcher, {
    dedupingInterval: 60_000 * 5,
    revalidateOnFocus: false,
    fallbackData: [],
    onSuccess: (data) => {
      // The saved choice persists across sessions, but the server's model
      // list can change (allowlist, removed API key). Keep the saved model
      // only while it's still offered — otherwise the UI shows one model
      // while the server silently answers with its fallback.
      const usable = data.filter((p) => p.hasAPIKey && p.models.length > 0);
      const saved = appStore.getState().chatModel;
      const stillOffered =
        !!saved &&
        usable.some(
          (p) =>
            p.provider === saved.provider &&
            p.models.some((m) => m.name === saved.model),
        );
      if (!stillOffered && usable[0]) {
        appStore.setState({
          chatModel: {
            provider: usable[0].provider,
            model: usable[0].models[0].name,
          },
        });
      }
    },
  });
};
