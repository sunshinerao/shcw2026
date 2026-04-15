import test from "node:test";
import assert from "node:assert/strict";

import { buildEventMapLinks } from "../lib/map-links";

test("buildEventMapLinks returns login-free options for Chinese locale", () => {
  const links = buildEventMapLinks({
    locale: "zh",
    venue: "上海世博中心",
    address: "浦东新区国展路 1099 号",
    city: "上海",
  });

  assert.match(links.tencentMapsLink, /qq\.com/);
  assert.match(links.appleMapsLink, /maps\.apple\.com/);
  assert.doesNotMatch(links.primaryActionLink, /amap\.com|baidu\.com/);
});

test("buildEventMapLinks preserves a readable location query", () => {
  const links = buildEventMapLinks({
    locale: "en",
    venue: "Shanghai World Expo Center",
    address: "1099 Guozhan Rd, Pudong",
    city: "Shanghai",
  });

  assert.equal(links.locationLabel, "Shanghai World Expo Center, 1099 Guozhan Rd, Pudong, Shanghai");
  assert.match(links.googleMapsLink, /google\.com\/maps/);
  assert.match(links.osmLink, /openstreetmap\.org/);
});
