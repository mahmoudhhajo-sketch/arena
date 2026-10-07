/**
 * Runs independent partitions in parallel while keeping every item inside one
 * partition strictly ordered. Match rounds use the division as their key: this
 * lets different divisions start and finish together without allowing two
 * transactions to recalculate the same table at the same time.
 */
export async function runPartitionedBatch<T>(
  items: T[],
  partition: (item: T) => string,
  worker: (item: T) => Promise<void>,
  concurrency = 8,
) {
  if (!items.length) return;
  const queues = new Map<string, T[]>();
  for (const item of items) {
    const key = partition(item);
    queues.set(key, [...(queues.get(key) || []), item]);
  }

  const ready = [...queues.keys()];
  const errors: unknown[] = [];
  let running = 0;

  await new Promise<void>((resolve) => {
    const launch = () => {
      while (running < Math.max(1, concurrency) && ready.length) {
        const key = ready.shift()!;
        const queue = queues.get(key)!;
        const item = queue.shift()!;
        running++;
        void worker(item)
          .catch((error) => errors.push(error))
          .finally(() => {
            running--;
            if (queue.length) ready.push(key);
            if (!running && !ready.length) resolve();
            else launch();
          });
      }
    };
    launch();
  });

  if (errors.length) throw new AggregateError(errors, `${errors.length} matchbearbetningar misslyckades.`);
}

export function fixtureLockKey(id: string) {
  let hash = 2166136261;
  for (const char of id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}
