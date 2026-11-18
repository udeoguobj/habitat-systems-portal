# Connecting real professional-body verification — network.html

After payment is confirmed, `network.js` currently **simulates** checking the submitted professional body number (a length check standing in for a real lookup) and shows either "Verified" or "Pending manual review".

## Regulatory bodies mapped in the code (`BODY_MAP` in network.js)
| Profession | Council | Official site |
|---|---|---|
| Engineer / Structural Engineer | COREN | coren.gov.ng |
| Surveyor | SURCON | surcon.gov.ng |
| Architect | ARCON | arcon.gov.ng |
| Town Planner / Planning Services | TOPREC | toprec.gov.ng |
| Estate Surveyor & Valuer | ESVARBON | esvarbon.gov.ng |
| Builder / Construction | CORBON | corbon.gov.ng |
| Environmental Consultant | EHORECON | ehorecon.gov.ng |
| Transport Planner | CILT Nigeria | ciltnigeria.org |
| Project Manager | PMI / relevant chartered body | pmi.org |

Confirm each URL and any registration-check page still applies before going live — councils update their sites periodically.

## Why this can't be a simple front-end fetch
Two blockers:
1. **CORS** — browsers block a webpage from directly reading another domain's HTML/API from client-side JS unless that domain explicitly allows it. None of the councils above are known to expose a public, CORS-enabled verification API.
2. **Security** — even if it worked, running the check client-side would let anyone tamper with the result in their browser before your "Verified" badge is granted.

## Recommended real implementation
1. **If a council offers an official API or bulk-verification agreement** (worth contacting them directly about, as some professional bodies provide this to partner platforms): your backend calls that API server-side with the submitted number and profession, and stores the result.
2. **If no API exists (the common case today):** queue a "Pending manual review" record in your backend (exactly what the current UI already shows as the fallback state). Your compliance team looks the number up on the council's public register page and manually flips the status in an admin panel. The front end doesn't change — it already renders "Pending manual review" correctly for this case.
3. **Either way**, only your backend should decide the final "Verified" badge shown on the public Network directory — the JS in this repo should call `GET /api/professionals/{id}/status` and render whatever your server returns, rather than deciding it in the browser as the demo version currently does.
