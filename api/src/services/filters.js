// Route presentation filters: max duration, max transfers, and direct only.

export function applyFilters(routes, params = {}) {
  const applied = {};
  let filtered = routes;

  if (params.max_duration_minutes !== undefined) {
    applied.max_duration_minutes = params.max_duration_minutes;
    filtered = filtered.filter((r) => r.duration_minutes <= params.max_duration_minutes);
  }

  if (params.max_transfers !== undefined) {
    applied.max_transfers = params.max_transfers;
    filtered = filtered.filter((r) => r.transfer_count <= params.max_transfers);
  }

  if (params.direct_only) {
    applied.direct_only = true;
    filtered = filtered.filter((r) => r.transfer_count === 0);
  }

  return { routes: filtered, applied };
}
