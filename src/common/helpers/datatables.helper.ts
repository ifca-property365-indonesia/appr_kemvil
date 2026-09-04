export interface DataTablesResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: Record<string, any>[];
}

/**
 * Padanan `DataTables::of($collection)->make(true)` (yajra/laravel-datatables)
 * untuk mode server-side: menerapkan pencarian, pengurutan dan paging pada
 * hasil query yang sudah ada di memori.
 */
export function dataTables(
  rows: Record<string, any>[],
  query: Record<string, any> = {},
): DataTablesResponse {
  const draw = Number(query.draw ?? 0) || 0;
  const start = Number(query.start ?? 0) || 0;
  const length = Number(query.length ?? 10);

  const columns: Array<{ data?: string; name?: string; searchable?: string | boolean }> =
    normalizeColumns(query.columns);

  const searchValue = String(query.search?.value ?? '').trim().toLowerCase();

  let filtered = rows;
  if (searchValue !== '') {
    filtered = rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(searchValue),
      ),
    );
  }

  const orders = normalizeOrder(query.order);
  if (orders.length > 0) {
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      for (const order of orders) {
        const column = columns[order.column];
        const field = column?.data ?? column?.name;
        if (!field) continue;

        const compared = compare(a[field], b[field]);
        if (compared !== 0) return order.dir === 'desc' ? -compared : compared;
      }
      return 0;
    });
    filtered = sorted;
  }

  const page = length < 0 ? filtered : filtered.slice(start, start + length);

  return {
    draw,
    recordsTotal: rows.length,
    recordsFiltered: filtered.length,
    data: page,
  };
}

function normalizeColumns(columns: any): Array<Record<string, any>> {
  if (!columns) return [];
  if (Array.isArray(columns)) return columns;
  // Express mem-parse `columns[0][data]` menjadi objek berindeks angka.
  return Object.keys(columns)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => columns[key]);
}

function normalizeOrder(order: any): Array<{ column: number; dir: string }> {
  if (!order) return [];
  const list = Array.isArray(order)
    ? order
    : Object.keys(order)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => order[key]);

  return list
    .map((item: any) => ({
      column: Number(item?.column ?? -1),
      dir: String(item?.dir ?? 'asc').toLowerCase(),
    }))
    .filter((item) => item.column >= 0);
}

function compare(a: any, b: any): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;

  if (a instanceof Date || b instanceof Date) {
    return new Date(a).getTime() - new Date(b).getTime();
  }

  const numA = Number(a);
  const numB = Number(b);
  if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB;

  return String(a).localeCompare(String(b));
}
