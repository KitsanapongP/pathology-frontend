# Health checks

Import `health.postman_collection.json` and `test.postman_environment.json` into
Postman, select the environment and set the approved base URLs:

- Portal local: `http://localhost:9100/v1`.
- Request local: `http://localhost:8000/v1`.
- Dev: use the backend's private IP with the same ports over the network/VPN.

The collection calls only `GET /health`. A 200 response confirms reachability,
not readiness of business APIs or browser CORS. Swagger is at
`/swagger/index.html` on the service host; see [API/auth](../docs/api-client.md).

Keep private IP values in ignored `dev.local.json` and real tokens in Postman
Vault/approved local storage. Do not export credentials, patient data or real
responses into the repository. Login/business requests are not in this collection;
add them only with the actual contract and approved synthetic test accounts.
