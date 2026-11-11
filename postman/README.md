# API testing

`health.postman_collection.json` contains only the two GET health endpoints
explicitly documented in the supplied backend base-URL handoff. Import this and
`test.postman_environment.json`, select the environment, and fill in the approved
base URLs from the backend team to test connectivity. An optional `dev.local.json`
can hold local-only values; it is ignored by Git and is not included in a clone. The local
base URLs are `http://localhost:9100/v1` for portal and
`http://localhost:8000/v1` for request. Base URLs already include `/v1`.

Start with Portal health. A request-service health response does not mean its
business APIs are ready. Dev requires the backend network/VPN. Credentials should
not be sent until the team confirms an approved transport: the handoff currently
specifies HTTP, not HTTPS. The latest Base URL handoff confirms portal port 9100
and request port 8000 locally and on the dev IP, with prod domains still pending.
Keep the actual private dev IP in ignored local environments. See
`docs/api-client.md` and `docs/session.md`.
Auth is now wired in the frontend; this collection still contains health checks
only and has not executed real login requests.

The handoff gives the Swagger path `/swagger/index.html` on the portal host
(outside `/v1`) and `POST /v1/auth/login`. Frontend login goes through portal,
not directly to Keycloak. The user supplied login, refresh/logout and initial
password-change contracts for frontend implementation. Roles and remaining
business endpoints still require the actual OpenAPI contract. No real tokens or
business/auth Postman examples have been added to this collection.

For the remaining APIs:

1. Import the backend's OpenAPI JSON/YAML into Postman as a collection.
2. Import `test.postman_environment.json`, select it and set `portalBaseUrl` and `requestBaseUrl` to approved test servers.
3. Replace request server URLs with the appropriate variable, preserving the API version prefix exactly once.
4. Configure authorization exactly as specified by the backend. Keep tokens in
   Postman Vault or an organization-approved local secret store, not shared values.
5. Start with a read-only request against synthetic records. Verify the expected
   status, schema and business result, then add missing/expired credentials and
   cross-role access cases using the backend's agreed expected responses.
6. Use Collection Runner to run the cases repeatedly. Review all imported scripts
   before running a collection. Add command-line execution to CI only after the
   collection, test data and secret injection have been agreed.

Example post-response script for an endpoint whose contract specifies HTTP 200:

```js
pm.test("Expected successful status", () => {
  pm.response.to.have.status(200);
});
```

Export reviewed collections without tokens, patient data or saved real responses.
Local environment exports can use `*.local.json` (ignored by Git and Docker).
Do not test writes against production. Postman success does not verify browser
CORS/cookie behavior. Authentication and response schemas still need integration
testing in the frontend.
