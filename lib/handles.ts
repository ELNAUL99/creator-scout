export function extractHandles(text: string) {
  const tiktok =
    text.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i)?.[1] ??
    text.match(/(?:^|\s)@([A-Za-z0-9._]{2,24})\s*(?:on\s+)?tiktok/i)?.[1] ??
    null;
  const instagram =
    text.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1] ??
    text.match(/(?:^|\s)@([A-Za-z0-9._]{2,24})\s*(?:on\s+)?insta/i)?.[1] ??
    null;
  return {
    tiktok: tiktok ? `@${tiktok.replace(/^@/, "")}` : null,
    instagram: instagram ? instagram.replace(/^@/, "") : null,
  };
}
