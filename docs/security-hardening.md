# Tolip security hardening

This phase adds defense-in-depth to the existing server and preserves the storefront/API contract.

## Implemented
- Common response headers: MIME sniffing protection, clickjacking protection, strict referrer policy, permissions policy, same-origin resource policy, and a restrictive CSP for object/embed, base URI, and framing.
- HSTS in production responses (HTTPS only).
- Vercel proxy trust configured for one hop so IP-based throttles can use the forwarded client IP.
- Request throttles for order creation (12 per 10 minutes per server instance/IP) and order tracking (30 per 10 minutes per instance/IP). Admin login retains its existing 8 attempts per 15 minutes limit.
- Bounded customer text fields and HTTP(S)-only map links before opening a database request.
- Uploaded image signatures checked against the declared PNG/JPEG/GIF/WebP type, in addition to admin authorization and the 8 MiB file-size limit.
- Regression tests for rate-limit behavior, response headers, order payload validation, and unsafe URL rejection.

## Important deployment limitation
The in-memory throttles are per server process/instance and are not a distributed quota across Vercel serverless instances. They are an emergency local guard, not a complete bot/DDoS solution. Before relying on a strict production-wide limit, configure Vercel Firewall rate limiting or use a shared atomic Neon-backed limiter. Do not interpret these changes as a completed penetration test or security certification.

## Follow-up
- Enable and verify Vercel Firewall managed protections and targeted API rate limits in the project dashboard.
- Configure a shared limiter for checkout/tracking if traffic or abuse warrants it.
- Review production environment secrets (AUTH_SECRET, admin credentials, BLOB_READ_WRITE_TOKEN) and rotate any credential that may have been exposed.
- Run a controlled staging test against a disposable Neon branch before production migration/deployment.
