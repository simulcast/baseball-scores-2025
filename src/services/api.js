export async function fetchGames(date) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  params.set('timezoneOffset', String(-new Date().getTimezoneOffset()));

  const response = await fetch(`/api/getGames?${params}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  return data.games ?? [];
}
