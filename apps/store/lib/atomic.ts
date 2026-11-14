export async function runAtomicMutation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  return operation();
}

export function outsideTransaction<T>(operation: () => T): T {
  return operation();
}
