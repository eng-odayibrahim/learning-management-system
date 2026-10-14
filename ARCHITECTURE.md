# LMS Architecture (Current Implementation)

## Runtime

- `client/` is a Next.js App Router frontend.
- `server/` is an Express API organized into identity, learning, assessment, video, shared, and configuration modules.
- MongoDB persists users, courses, curriculum, quizzes, enrollments, and assessment attempts. Redis and RabbitMQ are present in the development Compose stack; their production use and operational ownership require deployment-specific review.
- Academic taxonomy uses explicit grade-to-stage, track-to-grade, and specialization-to-track ObjectId relationships. Courses retain one identity and use `trackIds`/`specializationIds` applicability arrays for shared offerings. Legacy singular fields remain readable during migration.
- Private lesson video is served through the API authorization/proxy path and Cloudflare R2 integration. Bucket privacy and production credentials must be verified in Cloudflare.

## Authentication and authorization

Access JWTs are verified for algorithm, signature, issuer, audience, and expiration. Authenticated requests load the current user and compare the current session ID. Refresh tokens are hashed and rotated. Admin actions use module permissions; learner access is checked against official academic placement, course/lesson publication, and enrollment entitlement. Staff placement changes invalidate the current session and refresh credential.

The browser currently uses the existing localStorage token contract. Migrating to same-site secure cookies would require a coordinated API, frontend, CORS, CSRF, and session migration and has not been done.

## Learning and assessment

Courses and lessons have publication state. `EnrollmentModel` is the entitlement record; active/completed statuses grant access. `AssessmentAttempt` persists student-owned attempt state, server-calculated score, and completion. Quiz management remains in the existing Quiz aggregate/model.

Assignments and text submissions now have separate persistence and student/admin UI; they lack attachment support, gradebook history, and teacher scope. Progress aggregation, certificates, attendance, payment processing, and domain-event/outbox workflows are not implemented as complete domains.

## Deployment modes

The root `docker-compose.yml` is development configuration (bind mounts, development Dockerfiles, local port publishing bound to loopback). It is not a production deployment. Production must use a separate reviewed deployment definition, secret manager, private data services, TLS/reverse proxy, resource limits, and verified health and backup operations.
