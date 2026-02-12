export async function getWeather(lat: number, lon: number, timestamp?: string) {
  const when = timestamp ? new Date(timestamp) : new Date();
  const y = when.toISOString().slice(0, 10);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${y}&end_date=${y}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Weather API failed: ${resp.status}`);
  }

  const data = (await resp.json()) as any;
  const targetHour = when.toISOString().slice(0, 13);
  const times: string[] = data?.hourly?.time ?? [];
  let idx = times.findIndex((t) => t.startsWith(targetHour));
  if (idx < 0) idx = Math.max(0, times.length - 1);

  return {
    lat,
    lon,
    observed_at: times[idx] ?? when.toISOString(),
    wind_speed_mph: data?.hourly?.wind_speed_10m?.[idx] ?? null,
    temp_f: data?.hourly?.temperature_2m?.[idx] != null ? data.hourly.temperature_2m[idx] * 9 / 5 + 32 : null,
    humidity_pct: data?.hourly?.relative_humidity_2m?.[idx] ?? null,
    precip_in: data?.hourly?.precipitation?.[idx] != null ? data.hourly.precipitation[idx] / 25.4 : null,
    source: "open-meteo",
  };
}
