# Sol-6 source transport probes

GitHub Actions [run 35801130385](https://github.com/maxvfk/game-calendar/actions/runs/35801130385),
commit `1348ff1dbf4de01ee061c88b517194346ee8484e`, Ubuntu 24.04,
2026-09-23 00:14 UTC. The run uploaded `source-probes` metadata and official
publisher HTML as a temporary Actions artifact (30 days). Each API request
used the [public GitHub Contents endpoint](https://docs.github.com/en/rest/repos/contents#get-repository-content),
its documented raw media type and no credential. Mirrors without an explicit
redistribution license were **not** copied into the artifact. API response
ETags and SHA-256 hashes below identify the exact bytes observed on the runner;
the indexed Markdown/XML is the transport envelope, not automatically an
official publisher or a parser-ready calendar.

| Candidate | Exact URL | Result | ETag | SHA-256 | Assessment |
| --- | --- | --- | --- | --- | --- |
| Genshin KQM | `https://api.github.com/repos/KQM-git/GINews/contents/readme.md` | 200, raw Markdown, 95,030 bytes, rate limit remaining 58 | `ad47a7c99017e08438591236f05db0044e02bf5f` | `98b0e15c2cb11968ce78315d9e398082f1adf67d4fe3b7a5e7516ee5ecbbac20` | Usable **transport**, factual extraction/individual canonical URLs still require a narrow parser and tests. |
| HSR KQM | `https://api.github.com/repos/KQM-git/HSRNews/contents/readme.md` | 200, raw Markdown, 43,174 bytes, remaining 57 | `b9714ebab617d9e0be18e3a54554915dfa10b344` | `9e606b8af5843b51e2a50ec608b5536fd304c2a7944be8f78ff6860184c9d3e8` | Usable transport; server/global semantics must be verified per notice. |
| WuWa archive | `https://api.github.com/repos/TheLovinator1/wutheringwaves/contents/articles_latest.xml` | 200, raw XML, 95,955 bytes, remaining 56 | `c10c9e7f4c9a6688f4e69e08bdb984126f627d70` | `5e3a718fe86b2610580d38a256dccbe15dc0d9c5d23fc7222947b712576d00b4` | Usable discovery transport; subsequent bounded article JSON requests need an extraction fixture and source mapping. |
| ZZZ official | `https://zenless.hoyoverse.com/en-us/news` and `/en-us/news/166000` | robots.txt 404; each page 200 `text/html`, 8,184 bytes, same ETag and hash | `W/"c14850b6dcbe01d83eb242801f99fe6f"` | `826917d3ca2109f45e916f2173778838061f9e54fa9067a3d3592db895e12926` | **Unsuitable** for an HTML parser: the index and article contain identical JS shells, no target event name or 2026 date. Keep reviewed fallback. |
| Endfield official | `https://endfield.gryphline.com/en-us/news` and `/en-us/news/5208` | robots.txt redirected; no article request made | — | — | **Blocked**: the localized robots path also redirects, leaving rules unavailable. |

The first three responses expose `Last-Modified` (Sep 22, 2026) and standard
GitHub rate-limit headers. This confirms runner connectivity, not future parser
correctness. ZZZ returned the *same* page hash for two distinct URLs, so
search-rendered text is not a fixture. Official Endfield access remains closed
until its robots policy is known. No adapter was enabled by these probes.

Focused [run 35801291192](https://github.com/maxvfk/game-calendar/actions/runs/35801291192),
commit `e5ef899c89f5492fb11cf5e6ac5f30e8d3b9e64c`, established that
`https://endfield.gryphline.com/robots.txt` returns **307** with Location
`https://endfield.gryphline.com/en-us/robots.txt`. The original probe did not
follow this redirect and did not request content. Next probe follows this one
same-origin HTTPS redirect only when its destination still ends in robots.txt;
an unavailable or disallowing result still blocks the page requests.

Final [run 35801382417](https://github.com/maxvfk/game-calendar/actions/runs/35801382417),
commit `5101549ded7f6b2c6ee68b20dec754be3fe24e5f`, followed the one
same-origin HTTPS redirect to `/en-us/robots.txt`. That endpoint **also
returned 307**, so no rules could be read; its response hash was
`6efd3a747e083565b7445576829ec045b46dddef80ab6aa63c92c40f129d40cb`.
Neither the Endfield index nor article 5208 was requested. Classify this
surface **blocked for automatic fetching**; the reviewed records and the
working wiki.gg source remain the fallback. A future attempt may inspect the
full localized robots redirect chain, but must not bypass a challenge or treat
an unknown robots policy as permission to crawl.
