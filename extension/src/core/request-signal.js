export const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Combine a caller-provided cancellation signal with the configured timeout.
 * The caller must invoke cleanup once the request has settled.
 *
 * @param {AbortSignal | undefined} externalSignal
 * @param {number | undefined} timeoutMs
 */
export function createRequestSignal(externalSignal, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  let abortKind;
  const abort = kind => {
    abortKind ||= kind;
    controller.abort();
  };
  const onAbort = () => abort('aborted');
  externalSignal?.addEventListener('abort', onAbort, { once: true });
  const timeout = timeoutMs > 0 ? setTimeout(() => abort('timeout'), timeoutMs) : null;

  if (externalSignal?.aborted) onAbort();

  return {
    signal: controller.signal,
    getAbortKind: () => abortKind,
    cleanup: () => {
      if (timeout) clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', onAbort);
    }
  };
}
