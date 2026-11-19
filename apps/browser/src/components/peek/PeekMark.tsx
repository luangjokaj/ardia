import { memo } from "react";
import { View } from "react-native";
import { useTab } from "../../state/browser/hooks";
import { usePeekOpenedFrom } from "../../state/peek/hooks";
import { Favicon } from "../favicon/Favicon";
import { PEEK_MARK } from "./tokens";

export const PeekMark = memo(function PeekMark({ tabId, size }: { tabId: string; size: number }) {
  const peekId = usePeekOpenedFrom(tabId);
  return peekId ? <PeekedFavicon peekId={peekId} size={size} /> : null;
});

function PeekedFavicon({ peekId, size }: { peekId: string; size: number }) {
  const url = useTab(peekId, (t) => t?.url ?? "");
  const favicon = useTab(peekId, (t) => t?.favicon ?? null);
  const profileId = useTab(peekId, (t) => t?.profileId);
  const icon = Math.round(size * PEEK_MARK.scale);
  return (
    <View pointerEvents="none" accessibilityLabel="Has a Peek open" style={{ position: "absolute", right: -icon / 2, bottom: -icon / 3 }}>
      <Favicon url={url} favicon={favicon} size={icon} profileId={profileId} />
    </View>
  );
}
