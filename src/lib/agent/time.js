function getNow() {
  return new Date();
}

function startOfDayUTC(date) {
  const value = new Date(date);

  value.setUTCHours(0, 0, 0, 0);

  return value;
}

function addDaysUTC(date, days) {
  const value = new Date(date);

  value.setUTCDate(value.getUTCDate() + days);

  return value;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getTimeWindow(hourStart, minuteStart, hourEnd, minuteEnd = 59) {
  return {
    start: `${String(hourStart).padStart(2, "0")}:${String(
      minuteStart
    ).padStart(2, "0")}`,

    end: `${String(hourEnd).padStart(2, "0")}:${String(minuteEnd).padStart(
      2,
      "0"
    )}`,
  };
}

export function resolveTimeWindow(query, now = getNow()) {
  const text = String(query || "")
    .toLowerCase()
    .trim();

  const current = new Date(now);

  if (Number.isNaN(current.getTime())) {
    throw new Error("Invalid current date.");
  }

  const today = startOfDayUTC(current);

  const todayDate = formatDate(today);

  const tomorrow = addDaysUTC(today, 1);

  const tomorrowDate = formatDate(tomorrow);

  /*
   * -----------------------------------------------
   * TOMORROW + TIME
   * -----------------------------------------------
   *
   * Check these BEFORE generic evening/night rules.
   */

  if (/\btomorrow\s+(morning)\b/.test(text)) {
    return {
      dateFrom: tomorrowDate,
      dateTo: tomorrowDate,
      timeWindow: getTimeWindow(6, 0, 11, 59),
    };
  }

  if (/\btomorrow\s+(afternoon)\b/.test(text)) {
    return {
      dateFrom: tomorrowDate,
      dateTo: tomorrowDate,
      timeWindow: getTimeWindow(12, 0, 16, 59),
    };
  }

  if (/\btomorrow\s+(evening)\b/.test(text)) {
    return {
      dateFrom: tomorrowDate,
      dateTo: tomorrowDate,
      timeWindow: getTimeWindow(17, 0, 22, 59),
    };
  }

  if (/\btomorrow\s+(night)\b/.test(text)) {
    return {
      dateFrom: tomorrowDate,
      dateTo: tomorrowDate,
      timeWindow: getTimeWindow(17, 0, 23, 59),
    };
  }

  /*
   * -----------------------------------------------
   * TONIGHT
   * -----------------------------------------------
   */

  if (/\b(tonight|tonite)\b/.test(text)) {
    return {
      dateFrom: todayDate,
      dateTo: todayDate,
      timeWindow: getTimeWindow(17, 0, 23, 59),
    };
  }

  /*
   * -----------------------------------------------
   * THIS MORNING
   * -----------------------------------------------
   */

  if (/\b(this\s+morning|morning)\b/.test(text)) {
    return {
      dateFrom: todayDate,
      dateTo: todayDate,
      timeWindow: getTimeWindow(6, 0, 11, 59),
    };
  }

  /*
   * -----------------------------------------------
   * THIS AFTERNOON
   * -----------------------------------------------
   */

  if (/\b(this\s+afternoon|afternoon)\b/.test(text)) {
    return {
      dateFrom: todayDate,
      dateTo: todayDate,
      timeWindow: getTimeWindow(12, 0, 16, 59),
    };
  }

  /*
   * -----------------------------------------------
   * THIS EVENING
   * -----------------------------------------------
   */

  if (/\b(this\s+evening|evening)\b/.test(text)) {
    return {
      dateFrom: todayDate,
      dateTo: todayDate,
      timeWindow: getTimeWindow(17, 0, 22, 59),
    };
  }

  /*
   * -----------------------------------------------
   * TOMORROW
   * -----------------------------------------------
   */

  if (/\btomorrow\b/.test(text)) {
    return {
      dateFrom: tomorrowDate,
      dateTo: tomorrowDate,
      timeWindow: null,
    };
  }

  /*
   * -----------------------------------------------
   * TODAY
   * -----------------------------------------------
   */

  if (/\btoday\b/.test(text)) {
    return {
      dateFrom: todayDate,
      dateTo: todayDate,
      timeWindow: null,
    };
  }

  /*
   * -----------------------------------------------
   * THIS WEEKEND
   * -----------------------------------------------
   */

  if (/\b(this\s+weekend|weekend)\b/.test(text)) {
    const day = today.getUTCDay();

    const daysUntilSaturday = day === 6 ? 0 : day === 0 ? 6 : 6 - day;

    const saturday = addDaysUTC(today, daysUntilSaturday);

    const sunday = addDaysUTC(saturday, 1);

    return {
      dateFrom: formatDate(saturday),
      dateTo: formatDate(sunday),
      timeWindow: null,
    };
  }

  /*
   * -----------------------------------------------
   * NEXT WEEK
   * -----------------------------------------------
   */

  if (/\bnext\s+week\b/.test(text)) {
    const day = today.getUTCDay();

    const daysUntilMonday = day === 0 ? 1 : 8 - day;

    const monday = addDaysUTC(today, daysUntilMonday);

    const sunday = addDaysUTC(monday, 6);

    return {
      dateFrom: formatDate(monday),
      dateTo: formatDate(sunday),
      timeWindow: null,
    };
  }

  /*
   * -----------------------------------------------
   * DEFAULT
   * -----------------------------------------------
   */

  return {
    dateFrom: todayDate,
    dateTo: todayDate,
    timeWindow: null,
  };
}
