export class TerminologyRequestError extends Error {

  constructor(message, { kind, host, status, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'TerminologyRequestError';
    this.kind = kind || 'network';
    this.host = host;
    this.status = status;
  }
}

export function createRequestError(response, requestUrl, { cause } = {}) {
  const host = new URL(requestUrl).host;
  const status = response?.status;
  const isRedirect = response?.redirected
    || response?.type === 'opaqueredirect'
    || (status >= 300 && status < 400);
  const kind = isRedirect
    ? 'redirect'
    : !status
    ? 'network'
    : (status === 401 || status === 403 ? 'authorization' : 'server');
  const message = isRedirect
    ? `Terminology server ${host} redirected the request${status ? ` (HTTP ${status})` : ''}. Configure a redirect-free endpoint or a host-owned same-origin endpoint.`
    : status
    ? `Terminology server ${host} returned HTTP ${status}.`
    : `Terminology server ${host} could not be reached.`;

  return new TerminologyRequestError(message, { kind, host, status, cause });
}

export function createDataError(requestUrl, cause) {
  const host = new URL(requestUrl).host;

  return new TerminologyRequestError(
    `Terminology server ${host} returned invalid terminology data.`,
    { kind: 'data', host, cause }
  );
}
