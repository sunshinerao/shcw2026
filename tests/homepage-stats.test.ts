import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHomepageStats,
  countDistinctEventDays,
  formatEventDateRange,
} from "../lib/homepage-stats";

test("countDistinctEventDays computes the actual published date span covered by events", () => {
  assert.equal(
    countDistinctEventDays([
      { startDate: "2026-04-20", endDate: "2026-04-22" },
      { startDate: "2026-04-22", endDate: "2026-04-24" },
    ]),
    5
  );
});

test("formatEventDateRange renders localized real date ranges", () => {
  assert.equal(formatEventDateRange("2026-04-20", "2026-04-28", "zh"), "2026年4月20日 - 4月28日");
  assert.equal(formatEventDateRange("2026-04-20", "2026-04-28", "en"), "April 20-28, 2026");
});

test("buildHomepageStats hides attendee count when the backend toggle is off", () => {
  assert.deepEqual(
    buildHomepageStats(
      {
        eventDays: 9,
        forums: 15,
        speakers: 32,
        attendees: 680,
      },
      false
    ),
    [
      { key: "days", value: "9+" },
      { key: "forums", value: "15+" },
      { key: "speakers", value: "32+" },
    ]
  );

  assert.deepEqual(
    buildHomepageStats(
      {
        eventDays: 9,
        forums: 15,
        speakers: 32,
        attendees: 680,
      },
      true
    ),
    [
      { key: "days", value: "9+" },
      { key: "forums", value: "15+" },
      { key: "speakers", value: "32+" },
      { key: "attendees", value: "680+" },
    ]
  );
});
