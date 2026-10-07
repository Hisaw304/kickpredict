const DEFAULT_BINS = [
  { min: 0.5, max: 0.6 },
  { min: 0.6, max: 0.7 },
  { min: 0.7, max: 0.8 },
  { min: 0.8, max: 0.9 },
  { min: 0.9, max: 1.01 },
];

function findBucket(probability, bins) {
  return (
    bins.find((bin) => probability >= bin.min && probability < bin.max) || null
  );
}

/**
 * Build market-specific calibration data
 * from OUT-OF-SAMPLE backtest predictions.
 */
export function buildCalibrationProfile(
  results = [],
  { minSamples = 20, bins = DEFAULT_BINS } = {}
) {
  const marketBuckets = new Map();

  for (const result of results) {
    const predictions = result.prediction?.predictions || [];

    const evaluatedMarkets = result.evaluation?.markets || [];

    if (!predictions.length || !evaluatedMarkets.length) {
      continue;
    }

    const evaluationMap = new Map(
      evaluatedMarkets.map((item) => [item.market, item])
    );

    for (const prediction of predictions) {
      const probability = Number(prediction.probability);

      if (!Number.isFinite(probability)) {
        continue;
      }

      const market = prediction.market;

      if (!market) {
        continue;
      }

      const evaluation = evaluationMap.get(market);

      if (!evaluation) {
        continue;
      }

      const actualOutcome = Number(evaluation.actualOutcome);

      if (actualOutcome !== 0 && actualOutcome !== 1) {
        continue;
      }

      const probabilityDecimal = probability / 100;

      const bucket = findBucket(probabilityDecimal, bins);

      if (!bucket) {
        continue;
      }

      if (!marketBuckets.has(market)) {
        marketBuckets.set(market, new Map());
      }

      const buckets = marketBuckets.get(market);

      const key = `${bucket.min}-${bucket.max}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          min: bucket.min,
          max: bucket.max,
          count: 0,
          probabilitySum: 0,
          actualSum: 0,
        });
      }

      const stats = buckets.get(key);

      stats.count += 1;
      stats.probabilitySum += probabilityDecimal;
      stats.actualSum += actualOutcome;
    }
  }

  const profile = {};

  for (const [market, buckets] of marketBuckets) {
    const usableBuckets = [];

    for (const stats of buckets.values()) {
      if (stats.count < minSamples) {
        continue;
      }

      const meanProbability = stats.probabilitySum / stats.count;

      const observedRate = stats.actualSum / stats.count;

      usableBuckets.push({
        min: stats.min,
        max: stats.max,
        count: stats.count,

        meanProbability,

        observedRate,

        calibrationGap: observedRate - meanProbability,
      });
    }

    if (usableBuckets.length) {
      profile[market] = usableBuckets.sort((a, b) => a.min - b.min);
    }
  }

  return profile;
}

function getClosestBucket(market, probability, profile) {
  const buckets = profile?.[market];

  if (!Array.isArray(buckets) || !buckets.length) {
    return null;
  }

  const decimal = probability / 100;

  const direct = buckets.find(
    (bucket) => decimal >= bucket.min && decimal < bucket.max
  );

  if (direct) {
    return direct;
  }

  let closest = null;
  let smallestDistance = Infinity;

  for (const bucket of buckets) {
    const center = (bucket.min + Math.min(bucket.max, 1)) / 2;

    const distance = Math.abs(decimal - center);

    if (distance < smallestDistance) {
      smallestDistance = distance;
      closest = bucket;
    }
  }

  return closest;
}

function getAdaptiveShrinkage(sampleCount) {
  if (sampleCount >= 200) {
    return 0.75;
  }

  if (sampleCount >= 100) {
    return 0.65;
  }

  if (sampleCount >= 50) {
    return 0.55;
  }

  if (sampleCount >= 20) {
    return 0.4;
  }

  return 0.25;
}

/**
 * Convert raw model probability into a
 * conservative calibrated probability.
 */
export function calibrateProbability({
  probability,
  market,
  profile,
  shrinkage = null,
} = {}) {
  const raw = Number(probability);

  if (!Number.isFinite(raw)) {
    return {
      rawProbability: null,
      calibratedProbability: null,
      calibrationAdjustment: 0,
      reliability: "unknown",
      calibrationSamples: 0,
    };
  }

  const boundedRaw = Math.min(Math.max(raw, 0), 100);

  const bucket = getClosestBucket(market, boundedRaw, profile);

  /*
   * No usable historical calibration
   * data for this market/range.
   */
  if (!bucket) {
    return {
      rawProbability: Number(boundedRaw.toFixed(1)),

      calibratedProbability: Number(boundedRaw.toFixed(1)),

      calibrationAdjustment: 0,

      reliability: "uncalibrated",

      calibrationSamples: 0,
    };
  }

  const rawDecimal = boundedRaw / 100;

  /*
   * Blend the model probability with
   * the observed historical frequency.
   *
   * This prevents small samples from
   * completely overriding the model.
   */
  const effectiveShrinkage = Number.isFinite(shrinkage)
    ? Math.min(Math.max(shrinkage, 0), 1)
    : getAdaptiveShrinkage(bucket.count);

  const calibratedDecimal =
    rawDecimal * (1 - effectiveShrinkage) +
    bucket.observedRate * effectiveShrinkage;

  const calibrated = Math.min(Math.max(calibratedDecimal * 100, 0), 100);

  const adjustment = calibrated - boundedRaw;

  let reliability = "limited";

  if (bucket.count >= 100) {
    reliability = "strong";
  } else if (bucket.count >= 50) {
    reliability = "good";
  } else if (bucket.count >= 20) {
    reliability = "moderate";
  }

  return {
    rawProbability: Number(boundedRaw.toFixed(1)),

    calibratedProbability: Number(calibrated.toFixed(1)),

    calibrationAdjustment: Number(adjustment.toFixed(1)),

    reliability,

    calibrationSamples: bucket.count,

    observedRate: Number((bucket.observedRate * 100).toFixed(1)),

    calibrationGap: Number((bucket.calibrationGap * 100).toFixed(1)),
  };
}
