export class TerminologyRequestError extends Error {

  constructor(message, { kind, host, status, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'TerminologyRequestError';
    this.kind = kind || 'network';
    this.host = host;
    this.status = status;
  }
}

export function createRequestError(response, requestUrl) {
  const host = new URL(requestUrl).host;
  const status = response?.status;
  const kind = !status
    ? 'network'
    : (status === 401 || status === 403 ? 'authorization' : 'server');
  const message = status
    ? `Terminology server ${host} returned HTTP ${status}.`
    : `Terminology server ${host} could not be reached.`;

  return new TerminologyRequestError(message, { kind, host, status });
}
