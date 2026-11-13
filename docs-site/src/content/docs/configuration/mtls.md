---
title: Connecting to an mTLS-secured terminology server
description: Connect to a terminology server that requires a client certificate.
---

Some terminology servers require a client certificate. The extension runs in
the browser and does not handle certificate files or private keys. You can
connect through a proxy/backend or use a certificate installed in the browser.

## Option 1: Proxy or application backend

A proxy or backend holds the client certificate and connects to the terminology
server using mTLS. Configure the extension with the **proxy's FHIR URL**, not
the upstream server URL:

```js
createDefaultTerminologyModule({
  serverConfig: {
    fhirBaseUrl: 'https://proxy.example.org/fhir'
  }
});
```

Add the module to the modeler's `additionalModules`. You can use an existing
proxy such as the [DFN proxy](https://gitlab.com/mii-termserv/dfn-proxy), or
implement the mTLS connection in your own backend. The DFN `proxy.conf` is
specific to that proxy; another backend cannot use it without implementing
support for it.

**Security:** Restrict access to the proxy or backend, protect the certificate
and private key, and use HTTPS or a protected same-origin route. Do not expose
an unauthenticated proxy publicly: anyone who can use it may be able to use
its certificate. Configure CORS when the browser accesses it from another
origin. `localhost` refers to the browser user's machine, not necessarily the
server running the modeler.

The DFN proxy's upstream Quay image has a broken default startup command. If
building from its source, create the Gradle application distribution with
`installDist` and start its generated script instead. Consult the proxy
repository for its configuration.

## Option 2: Certificate in the browser

Import the `.p12` client certificate into the browser or operating system,
following your browser's instructions. The browser selects the certificate and
performs the TLS handshake; JavaScript cannot supply a certificate file to
`fetch`.

Configure the direct FHIR URL and opt in to credentials **only for that origin**:

```js
const fhirBaseUrl = 'https://terminology.example.org/fhir';
const fhirOrigin = new URL(fhirBaseUrl).origin;

const terminologyModule = createDefaultTerminologyModule({
  serverConfig: { fhirBaseUrl },
  fetchFn: (input, init) => {
    const url = new URL(
      input instanceof Request ? input.url : input,
      window.location.href
    );
    return fetch(input, url.origin === fhirOrigin
      ? { ...init, credentials: 'include' }
      : init);
  }
});
```

Add `terminologyModule` to the modeler's `additionalModules`. For cross-origin
requests, the server must allow the modeler's exact origin and return
`Access-Control-Allow-Credentials: true`; `*` is not sufficient with
credentials. `credentials: 'include'` also permits cookies and other
credentials for that origin. Preflight and client-certificate behavior can
vary between browsers and settings.
