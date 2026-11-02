# cms service

CMS and website content: pages, articles, reviews, FAQs, statistics, hero banners, and published content snapshots.
Owns the `cms` schema: `page`, `article`, `review`, `faq`, `statistic`, `snapshot`, and `outbox`.
The HTTP contract is [api/openapi.yaml](api/openapi.yaml); typed client functions live in `@platform/api-client`.

## Responsibilities

- **Website Content**: Structured CMS pages made of blocks, navigation menus, and localized article posts.
- **Interactive Elements**: Customer reviews, frequently asked questions (FAQs), and impact statistics.
- **Publishing & Snapshots**: Immutable snapshots of published website states with transactional revalidation triggers.
- **Outbox Events**: Emits `cms.page.published.v1`, `cms.article.published.v1`, and snapshot change notifications to NATS JetStream.

## Endpoints

| Path | Caller | Authorization |
|---|---|---|
| `GET /v1/cms/pages` | Admin & Web | `cms:read` / public read |
| `POST /v1/cms/pages` | Admin app | `cms:edit` |
| `GET /v1/cms/articles` | Admin & Web | `cms:read` / public read |
| `POST /v1/cms/articles` | Admin app | `cms:edit` |
| `GET /v1/cms/reviews` | Admin & Web | `cms:read` / public read |
| `POST /v1/cms/reviews` | Admin & Web | `cms:edit` / public submit |
| `GET /v1/cms/faqs` | Admin & Web | `cms:read` / public read |
| `GET /v1/cms/stats` | Admin & Web | `cms:read` / public read |
| `POST /v1/cms/snapshots` | Admin app | `cms:publish` |

## Running

The service binary supports `serve`, `worker`, `migrate`, and `healthcheck`.
- Public API on `:8080` (behind gateway route `/v1/cms/`)
- Admin listener on `:9090` (`/livez`, `/readyz`, `/metrics`)
