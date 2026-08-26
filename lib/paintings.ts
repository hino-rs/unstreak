import type { SupabaseClient } from "@supabase/supabase-js";

export const PAINTING_STAGE_THRESHOLD = 3;

export type PaintingCatalogItem = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  year: string;
  tier: number;
  imageUrl: string;
};

export type PaintingSummary = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  year: string;
  imageUrl: string;
};

export type NoticeableElement = { label: string; keywords: string[] };

export type TourPageFact = {
  heading: string;
  groundingBody: string;
  focusX: number;
  focusY: number;
  zoom: number;
};

export type PaintingFactBase = {
  background: string;
  intent: string;
  interpretations: string[];
  noticeableElements: NoticeableElement[];
  tourPages: TourPageFact[];
};

export async function getPaintingCatalog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>
): Promise<PaintingCatalogItem[]> {
  const { data, error } = await supabase
    .from("paintings")
    .select("id, slug, title, artist, year, tier, image_url")
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    artist: p.artist,
    year: p.year,
    tier: p.tier,
    imageUrl: p.image_url,
  }));
}

export async function getPaintingSummaryBySlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  slug: string
): Promise<PaintingSummary | null> {
  const { data, error } = await supabase
    .from("paintings")
    .select("id, slug, title, artist, year, image_url")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    artist: data.artist,
    year: data.year,
    imageUrl: data.image_url,
  };
}

export async function getPaintingFactBaseById(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  paintingId: string
): Promise<PaintingFactBase | null> {
  const [paintingRes, elementsRes, tourPagesRes] = await Promise.all([
    supabase
      .from("paintings")
      .select("background, intent, interpretations")
      .eq("id", paintingId)
      .maybeSingle(),
    supabase
      .from("painting_noticeable_elements")
      .select("label, keywords")
      .eq("painting_id", paintingId)
      .order("position", { ascending: true }),
    supabase
      .from("painting_tour_pages")
      .select("heading, grounding_body, focus_x, focus_y, zoom")
      .eq("painting_id", paintingId)
      .order("position", { ascending: true }),
  ]);

  if (paintingRes.error) throw paintingRes.error;
  if (elementsRes.error) throw elementsRes.error;
  if (tourPagesRes.error) throw tourPagesRes.error;
  if (!paintingRes.data) return null;

  return {
    background: paintingRes.data.background,
    intent: paintingRes.data.intent,
    interpretations: paintingRes.data.interpretations ?? [],
    noticeableElements: (elementsRes.data ?? []).map((el) => ({
      label: el.label,
      keywords: el.keywords ?? [],
    })),
    tourPages: (tourPagesRes.data ?? []).map((p) => ({
      heading: p.heading,
      groundingBody: p.grounding_body,
      focusX: p.focus_x,
      focusY: p.focus_y,
      zoom: p.zoom,
    })),
  };
}

export async function getCompletedPaintingSlugs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("painting_attempts")
    .select("painting_id, paintings!inner(slug)")
    .eq("user_id", userId)
    .not("completed_at", "is", null);
  if (error) throw error;
  const slugs = new Set<string>();
  for (const row of data ?? []) {
    // supabase-jsの型推論は`paintings!inner(slug)`を配列として推論するが、
    // inner joinのため実際は常に単一オブジェクトで返ってくる
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slug = (row.paintings as any)?.slug;
    if (slug) slugs.add(slug);
  }
  return [...slugs];
}

// AnthropicのURLソースはWikimedia Commons(commons.wikimedia.org→upload.wikimedia.orgの
// クロスドメインリダイレクトを挟む)を直接フェッチできず400を返すため、サーバー側で取得して
// base64で渡す。Unsplash(既存①)はリダイレクトなしの直接URLでtype:'url'のまま動作するため対象外
export async function fetchPaintingImageAsBase64(
  url: string
): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`絵画画像の取得に失敗しました(${res.status}): ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const mediaType = res.headers.get("content-type")?.split(";")[0].trim() || "image/jpeg";
  return { data: buffer.toString("base64"), mediaType };
}

// Round1回答とfact-baseの注目要素をキーワードで突合する。
// AIには判定させず機械的に行うことで、AI3への入力(noticed/missed)自体の信頼性を担保する
export function matchNoticeableElements(
  text: string,
  elements: NoticeableElement[]
): { noticedLabels: string[]; missedLabels: string[] } {
  const lower = text.toLowerCase();
  const noticedLabels: string[] = [];
  const missedLabels: string[] = [];
  for (const el of elements) {
    if (el.keywords.some((kw) => lower.includes(kw))) {
      noticedLabels.push(el.label);
    } else {
      missedLabels.push(el.label);
    }
  }
  return { noticedLabels, missedLabels };
}
