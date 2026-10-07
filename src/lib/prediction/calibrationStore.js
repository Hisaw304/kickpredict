import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn("Supabase calibration store is not configured.");
}

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

/*
 * Convert the calibration profile produced by
 * buildCalibrationProfile() into database rows.
 */
function profileToRows(profile = {}) {
  const rows = [];

  for (const [market, buckets] of Object.entries(profile)) {
    if (!Array.isArray(buckets)) {
      continue;
    }

    for (const bucket of buckets) {
      const sampleCount = Number(bucket.count || 0);

      const meanProbability = Number(bucket.meanProbability || 0);

      const observedRate = Number(bucket.observedRate || 0);

      const calibrationGap = Number(
        bucket.calibrationGap ?? observedRate - meanProbability
      );

      if (
        !Number.isFinite(sampleCount) ||
        !Number.isFinite(meanProbability) ||
        !Number.isFinite(observedRate) ||
        !Number.isFinite(calibrationGap)
      ) {
        continue;
      }

      rows.push({
        market,

        bucket_min: Number(bucket.min),

        bucket_max: Number(bucket.max),

        sample_count: Math.max(Math.round(sampleCount), 0),

        mean_probability: meanProbability,

        observed_rate: observedRate,

        calibration_gap: calibrationGap,

        updated_at: new Date().toISOString(),
      });
    }
  }

  return rows;
}

/*
 * Convert database rows back into the exact
 * structure expected by calibrateProbability().
 */
function rowsToProfile(rows = []) {
  const profile = {};

  for (const row of rows) {
    const market = row.market;

    if (!market) {
      continue;
    }

    if (!profile[market]) {
      profile[market] = [];
    }

    profile[market].push({
      min: Number(row.bucket_min),

      max: Number(row.bucket_max),

      count: Number(row.sample_count || 0),

      meanProbability: Number(row.mean_probability || 0),

      observedRate: Number(row.observed_rate || 0),

      calibrationGap: Number(row.calibration_gap || 0),
    });
  }

  for (const market of Object.keys(profile)) {
    profile[market].sort((a, b) => a.min - b.min);
  }

  return profile;
}

/*
 * Save or update a complete calibration profile.
 */
export async function saveCalibrationProfile(profile = {}) {
  if (!supabase) {
    throw new Error("Supabase calibration store is not configured.");
  }

  const rows = profileToRows(profile);

  if (!rows.length) {
    return {
      saved: 0,
      markets: 0,
      rows: [],
    };
  }

  const { data, error } = await supabase
    .from("calibration_profiles")
    .upsert(rows, {
      onConflict: "market,bucket_min,bucket_max",
    })
    .select();

  if (error) {
    throw error;
  }

  return {
    saved: Array.isArray(data) ? data.length : rows.length,

    markets: new Set(rows.map((row) => row.market)).size,

    rows: data || rows,
  };
}

/*
 * Load the persistent calibration profile.
 */
export async function loadCalibrationProfile() {
  if (!supabase) {
    throw new Error("Supabase calibration store is not configured.");
  }

  const { data, error } = await supabase
    .from("calibration_profiles")
    .select(
      [
        "market",
        "bucket_min",
        "bucket_max",
        "sample_count",
        "mean_probability",
        "observed_rate",
        "calibration_gap",
        "updated_at",
      ].join(",")
    )
    .order("market", {
      ascending: true,
    })
    .order("bucket_min", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return rowsToProfile(data || []);
}

/*
 * Return useful information about the
 * current persistent calibration profile.
 */
export async function getCalibrationProfileStats() {
  if (!supabase) {
    throw new Error("Supabase calibration store is not configured.");
  }

  const { data, error } = await supabase
    .from("calibration_profiles")
    .select(["market", "sample_count", "updated_at"].join(","));

  if (error) {
    throw error;
  }

  const rows = data || [];

  const markets = new Set(rows.map((row) => row.market));

  const totalSamples = rows.reduce(
    (total, row) => total + Number(row.sample_count || 0),
    0
  );

  const updatedAt = rows.reduce((latest, row) => {
    if (!row.updated_at) {
      return latest;
    }

    if (
      !latest ||
      new Date(row.updated_at).getTime() > new Date(latest).getTime()
    ) {
      return row.updated_at;
    }

    return latest;
  }, null);

  return {
    markets: markets.size,

    buckets: rows.length,

    totalSamples,

    updatedAt,
  };
}
