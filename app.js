const BASE_URL = 'https://api.massive.com';

async function fetchTopLosers(limit = 100) {
  const res = await fetch(
    `${BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers?include_otc=false&apiKey=${CONFIG.API_KEY}`
  );
  const data = await res.json();

  if (data.status && data.status !== 'OK') {
    throw new Error(data.message || data.status);
  }

  return (data.tickers ?? [])
    .filter(t => t.todaysChangePerc < 0 && t.updated > 0)
    .sort((a, b) => a.todaysChangePerc - b.todaysChangePerc)
    .slice(0, limit);
}

async function fetchChartData(ticker, multiplier, timespan, from, to) {
  const url = `${BASE_URL}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${CONFIG.API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status && data.status !== 'OK' && data.status !== 'DELAYED') {
    throw new Error(data.message || data.status);
  }

  return (data.results ?? []).map(r => ({
    time: Math.floor(r.t / 1000),
    open: r.o,
    high: r.h,
    low: r.l,
    close: r.c,
    value: r.c,
    volume: r.v,
  }));
}

function getPeriodParams(period) {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  const from = new Date(now);

  const map = {
    '1D':  { days: 1,    multiplier: 1,  timespan: 'minute' },
    '5D':  { days: 5,    multiplier: 5,  timespan: 'minute' },
    '1M':  { days: 30,   multiplier: 1,  timespan: 'hour'   },
    '3M':  { days: 90,   multiplier: 1,  timespan: 'day'    },
    '6M':  { days: 180,  multiplier: 1,  timespan: 'day'    },
    '1Y':  { days: 365,  multiplier: 1,  timespan: 'day'    },
    '2Y':  { days: 730,  multiplier: 1,  timespan: 'week'   },
    '5Y':  { days: 1825, multiplier: 1,  timespan: 'week'   },
  };

  const { days, multiplier, timespan } = map[period];
  from.setDate(from.getDate() - days);
  return { multiplier, timespan, from: from.toISOString().split('T')[0], to };
}
