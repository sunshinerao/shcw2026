export type MapLinkInput = {
  locale: "zh" | "en";
  venue?: string | null;
  address?: string | null;
  city?: string | null;
};

function clean(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildEventMapLinks(input: MapLinkInput) {
  const venue = clean(input.venue);
  const address = clean(input.address);
  const city = clean(input.city);
  const locationLabel = [venue, address, city].filter(Boolean).join(", ");
  const encodedQuery = encodeURIComponent(locationLabel || venue || address || city);
  const encodedRegion = encodeURIComponent(city);
  const tencentBase = `https://apis.map.qq.com/uri/v1/search?keyword=${encodedQuery}&referer=shcw2026`;

  return {
    locationLabel,
    googleMapsEmbed: `https://maps.google.com/maps?q=${encodedQuery}&output=embed&hl=${input.locale === "zh" ? "zh-CN" : "en"}`,
    googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
    appleMapsLink: `https://maps.apple.com/?q=${encodedQuery}`,
    osmLink: `https://www.openstreetmap.org/search?query=${encodedQuery}`,
    tencentMapsLink: city ? `${tencentBase}&region=${encodedRegion}` : tencentBase,
    primaryActionLink:
      input.locale === "zh"
        ? (city ? `${tencentBase}&region=${encodedRegion}` : tencentBase)
        : `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
  };
}
