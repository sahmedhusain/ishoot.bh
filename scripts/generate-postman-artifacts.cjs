const fs = require("fs");
const path = require("path");
const { importJWK, SignJWT } = require("../apps/admin/node_modules/jose");

async function main() {
  const root = path.resolve(__dirname, "..");
  const envContent = fs.readFileSync(path.join(root, ".env"), "utf8");
  const match = envContent.match(/^ADMIN_SERVICE_KEY="(.*?)"/m);
  if (!match) throw new Error("ADMIN_SERVICE_KEY not found in .env");

  const rawJwk = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
  const key = await importJWK(rawJwk, "EdDSA");
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ token_use: "access" })
    .setProtectedHeader({ alg: "EdDSA", kid: rawJwk.kid, typ: "JWT" })
    .setIssuer("service:admin")
    .setSubject("admin")
    .setAudience("platform:service")
    .setIssuedAt(now)
    .setExpirationTime(now + 86400 * 30) // 30 days valid for testing
    .sign(key);

  const envFile = path.join(root, "docs/api/gateway.env.json");
  const envData = {
    id: "gateway-local-env",
    name: "Gateway Local Environment",
    values: [
      { key: "baseUrl", value: "http://127.0.0.1:8080", enabled: true },
      { key: "serviceToken", value: token, enabled: true },
    ],
  };
  fs.writeFileSync(envFile, JSON.stringify(envData, null, 2), "utf8");
  console.log("✅ Generated docs/api/gateway.env.json");

  const collectionFile = path.join(root, "docs/api/combined-openapi.postman_collection.json");
  const collectionData = {
    info: {
      name: "Platform Gateway Smoke Tests",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [
      {
        name: "Health Checks",
        item: [
          {
            name: "Gateway Health",
            request: {
              method: "GET",
              url: { raw: "http://127.0.0.1:9080/readyz", protocol: "http", host: ["127", "0", "0", "1"], port: "9080", path: ["readyz"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Status is up', function () { var d = pm.response.json(); pm.expect(d.status).to.eql('up'); });",
                  ],
                },
              },
            ],
          },
          {
            name: "Finance Health",
            request: {
              method: "GET",
              url: { raw: "http://127.0.0.1:9091/readyz", protocol: "http", host: ["127", "0", "0", "1"], port: "9091", path: ["readyz"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Status is up', function () { var d = pm.response.json(); pm.expect(d.status).to.eql('up'); });",
                  ],
                },
              },
            ],
          },
          {
            name: "Sales Health",
            request: {
              method: "GET",
              url: { raw: "http://127.0.0.1:9094/readyz", protocol: "http", host: ["127", "0", "0", "1"], port: "9094", path: ["readyz"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Status is up', function () { var d = pm.response.json(); pm.expect(d.status).to.eql('up'); });",
                  ],
                },
              },
            ],
          },
          {
            name: "Inventory Health",
            request: {
              method: "GET",
              url: { raw: "http://127.0.0.1:9093/readyz", protocol: "http", host: ["127", "0", "0", "1"], port: "9093", path: ["readyz"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Status is up', function () { var d = pm.response.json(); pm.expect(d.status).to.eql('up'); });",
                  ],
                },
              },
            ],
          },
          {
            name: "ITSM Health",
            request: {
              method: "GET",
              url: { raw: "http://127.0.0.1:9083/readyz", protocol: "http", host: ["127", "0", "0", "1"], port: "9083", path: ["readyz"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Status is up', function () { var d = pm.response.json(); pm.expect(d.status).to.eql('up'); });",
                  ],
                },
              },
            ],
          },
          {
            name: "Identity Health",
            request: {
              method: "GET",
              url: { raw: "http://127.0.0.1:9082/readyz", protocol: "http", host: ["127", "0", "0", "1"], port: "9082", path: ["readyz"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Status is up', function () { var d = pm.response.json(); pm.expect(d.status).to.eql('up'); });",
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        name: "CRUD",
        item: [
          {
            name: "List Invoices",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{serviceToken}}" }],
              url: { raw: "{{baseUrl}}/v1/finance/invoices", host: ["{{baseUrl}}"], path: ["v1", "finance", "invoices"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Invoices array returned', function () { var d = pm.response.json(); pm.expect(Array.isArray(d)).to.be.true; });",
                  ],
                },
              },
            ],
          },
          {
            name: "List Contacts",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{serviceToken}}" }],
              url: { raw: "{{baseUrl}}/v1/sales/contacts", host: ["{{baseUrl}}"], path: ["v1", "sales", "contacts"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Contacts array returned', function () { var d = pm.response.json(); pm.expect(Array.isArray(d)).to.be.true; });",
                  ],
                },
              },
            ],
          },
          {
            name: "List Deals",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{serviceToken}}" }],
              url: { raw: "{{baseUrl}}/v1/sales/deals", host: ["{{baseUrl}}"], path: ["v1", "sales", "deals"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Deals array returned', function () { var d = pm.response.json(); pm.expect(Array.isArray(d)).to.be.true; });",
                  ],
                },
              },
            ],
          },
          {
            name: "List Products",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{serviceToken}}" }],
              url: { raw: "{{baseUrl}}/v1/inventory/products", host: ["{{baseUrl}}"], path: ["v1", "inventory", "products"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Products array returned', function () { var d = pm.response.json(); pm.expect(Array.isArray(d)).to.be.true; });",
                  ],
                },
              },
            ],
          },
          {
            name: "List Employees",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{serviceToken}}" }],
              url: { raw: "{{baseUrl}}/v1/hr/employees", host: ["{{baseUrl}}"], path: ["v1", "hr", "employees"] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Employees array returned', function () { var d = pm.response.json(); pm.expect(Array.isArray(d)).to.be.true; });",
                  ],
                },
              },
            ],
          },
          {
            name: "List CMS Pages",
            request: {
              method: "GET",
              header: [{ key: "Authorization", value: "Bearer {{serviceToken}}" }],
              url: { raw: "{{baseUrl}}/v1/cms/pages?all=true", host: ["{{baseUrl}}"], path: ["v1", "cms", "pages"], query: [{ key: "all", value: "true" }] },
            },
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test('Status is 200', function () { pm.response.to.have.status(200); });",
                    "pm.test('Pages array returned', function () { var d = pm.response.json(); pm.expect(Array.isArray(d)).to.be.true; });",
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  fs.writeFileSync(collectionFile, JSON.stringify(collectionData, null, 2), "utf8");
  console.log("✅ Generated docs/api/combined-openapi.postman_collection.json");
}

main().catch(console.error);
