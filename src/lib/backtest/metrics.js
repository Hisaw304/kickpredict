function clampProbability(value) {
  return Math.min(Math.max(value, 0.000001), 0.999999);
}

export function calculateBrierScore(predictedProbability, outcome) {
  const p = clampProbability(predictedProbability);

  return Math.pow(p - outcome, 2);
}

export function calculateLogLoss(predictedProbability, outcome) {
  const p = clampProbability(predictedProbability);

  return -(outcome * Math.log(p) + (1 - outcome) * Math.log(1 - p));
}

export function calculateAccuracy(results = []) {
  if (!results.length) {
    return 0;
  }

  const correct = results.filter((result) => result.correct).length;

  return correct / results.length;
}

export function calculateAverage(values = []) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateMetrics(results = []) {
  if (!results.length) {
    return {
      samples: 0,
      accuracy: 0,
      brierScore: 0,
      logLoss: 0,
    };
  }

  return {
    samples: results.length,

    accuracy: calculateAccuracy(results),

    brierScore: calculateAverage(results.map((result) => result.brierScore)),

    logLoss: calculateAverage(results.map((result) => result.logLoss)),
  };
}

/*
 * Metrics grouped by market.
 */
export function calculateMarketMetrics(results = []) {
  const groupedMarkets = new Map();

  for (const result of results) {
    const market = result.market || result.label || "unknown";

    if (!groupedMarkets.has(market)) {
      groupedMarkets.set(market, []);
    }

    groupedMarkets.get(market).push(result);
  }

  const marketMetrics = {};

  for (const [market, marketResults] of groupedMarkets.entries()) {
    marketMetrics[market] = calculateMetrics(marketResults);
  }

  return marketMetrics;
}

/*
 * Metrics above probability
 * thresholds.
 */
export function calculateThresholdMetrics(
  results = [],
  thresholds = [65, 70, 75, 80, 85]
) {
  const output = {};

  for (const threshold of thresholds) {
    const filtered = results.filter(
      (result) =>
        Number.isFinite(result.predictedProbability) &&
        result.predictedProbability >= threshold
    );

    output[threshold] = calculateMetrics(filtered);
  }

  return output;
}

/*
 * Threshold metrics by market.
 */
export function calculateMarketThresholdMetrics(
  results = [],
  thresholds = [65, 70, 75, 80, 85]
) {
  const groupedMarkets = new Map();

  for (const result of results) {
    const market = result.market || result.label || "unknown";

    if (!groupedMarkets.has(market)) {
      groupedMarkets.set(market, []);
    }

    groupedMarkets.get(market).push(result);
  }

  const output = {};

  for (const [market, marketResults] of groupedMarkets.entries()) {
    output[market] = calculateThresholdMetrics(marketResults, thresholds);
  }

  return output;
}

/*
 * Probability calibration buckets.
 *
 * Each prediction is placed into the
 * probability range it belongs to.
 *
 * Example:
 *
 * 82.4% -> 80-89
 * 91.2% -> 90-100
 */
export function calculateCalibration(results = []) {
  const buckets = [
    {
      key: "50-59",
      min: 50,
      max: 59.999999,
    },
    {
      key: "60-69",
      min: 60,
      max: 69.999999,
    },
    {
      key: "70-79",
      min: 70,
      max: 79.999999,
    },
    {
      key: "80-89",
      min: 80,
      max: 89.999999,
    },
    {
      key: "90-100",
      min: 90,
      max: 100,
    },
  ];

  const output = {};

  for (const bucket of buckets) {
    const bucketResults = results.filter((result) => {
      const probability = Number(result.predictedProbability);

      return (
        Number.isFinite(probability) &&
        probability >= bucket.min &&
        probability <= bucket.max
      );
    });

    const samples = bucketResults.length;

    if (!samples) {
      output[bucket.key] = {
        samples: 0,
        averagePredictedProbability: 0,
        actualHitRate: 0,
        calibrationError: 0,
        brierScore: 0,
        logLoss: 0,
      };

      continue;
    }

    const averagePredictedProbability = calculateAverage(
      bucketResults.map((result) => Number(result.predictedProbability))
    );

    const actualHitRate = calculateAccuracy(bucketResults);

    output[bucket.key] = {
      samples,

      averagePredictedProbability,

      actualHitRate,

      /*
       * Positive value means the model
       * predicted higher than what
       * actually happened.
       */
      calibrationError: averagePredictedProbability - actualHitRate * 100,

      brierScore: calculateAverage(
        bucketResults.map((result) => result.brierScore)
      ),

      logLoss: calculateAverage(bucketResults.map((result) => result.logLoss)),
    };
  }

  return output;
}

/*
 * Probability calibration grouped
 * separately by market.
 */
export function calculateMarketCalibration(results = []) {
  const groupedMarkets = new Map();

  for (const result of results) {
    const market = result.market || result.label || "unknown";

    if (!groupedMarkets.has(market)) {
      groupedMarkets.set(market, []);
    }

    groupedMarkets.get(market).push(result);
  }

  const output = {};

  for (const [market, marketResults] of groupedMarkets.entries()) {
    output[market] = calculateCalibration(marketResults);
  }

  return output;
}
