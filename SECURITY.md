# Security Operations

## Configuration

Use the root and service `.env.example` files as variable-name references only. Keep real values in ignored local `.env` files for development and in a secrets manager for deployment. The API requires strong, distinct JWT access and refresh secrets. Never log tokens, passwords, API keys, database credentials, or upload contents.

## Authorization

Course, lesson, assessment, coursework, and material-download access is enforced on the server. Paid-course entitlement requires an active or completed enrollment. Enrollment activation is administrative pending an approved payment flow. Private video and materials must remain in a private bucket and use the API's short-lived authorization path.

## Uploads and assessments

The API applies file-size/count/field limits and validates extension, MIME, and signatures on supported upload routes. Assessment attempt ownership, limits, deadline, and grading are server-side. Continue adding HTTP-level tests for malformed multipart bodies and race scenarios.

## Deployment caveats

- Verify Cloudflare R2 bucket access is private and that production CORS and credentials are least-privilege.
- `docker-compose.yml` is for local development only; all published ports currently bind to loopback.
- No production secret manager, external TLS ingress, backup target, restore drill, or monitoring integration is configured in this repository.
- If configured credentials were ever committed, rotate them. This workspace did not include Git history, so historical exposure could not be checked.
- Production-only dependency audits for the backend and client reported zero vulnerabilities at the time checked. Full audits still report six high backend findings and nine high client findings in development/build tooling, including glob dependencies and Next ESLint tooling.
