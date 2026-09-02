import { useQuery } from "@tanstack/react-query";
import { FileMusic, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

type Props = {
  path: string;
  type: string | null;
  name: string | null;
};

export function Attachment({ path, type, name }: Props) {
  const { data: url, isLoading } = useQuery({
    queryKey: ["signed-url", path],
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  if (isLoading || !url) {
    return (
      <div className="flex h-28 w-52 items-center justify-center rounded-xl bg-surface-raised/70">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (type?.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img
          src={url}
          alt={name ?? "Shared image"}
          loading="lazy"
          className="max-h-72 w-full max-w-xs rounded-xl object-cover"
        />
      </a>
    );
  }

  if (type?.startsWith("video/")) {
    return <video src={url} controls className="max-h-72 w-full max-w-xs rounded-xl" />;
  }

  if (type?.startsWith("audio/")) {
    return (
      <div className="w-60 space-y-2 rounded-xl bg-surface-raised/70 p-3">
        <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
          <FileMusic className="size-3.5 shrink-0" />
          {name ?? "Audio"}
        </p>
        <audio src={url} controls className="w-full" />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block max-w-xs truncate rounded-xl bg-surface-raised/70 px-3 py-2 text-sm underline-offset-4 hover:underline"
    >
      {name ?? "Attachment"}
    </a>
  );
}
