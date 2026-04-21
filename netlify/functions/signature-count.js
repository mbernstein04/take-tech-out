// Netlify Function: returns the current submission count for the petition form.
// Uses the site-scoped submissions endpoint with per_page=1 pagination so the
// count is accurate at any scale — Netlify returns a Link header whose rel="last"
// page number equals the total submission count when per_page=1.
//
// Expects env vars (Netlify dashboard → Site configuration → Environment variables):
//   NETLIFY_API_TOKEN — personal access token
//   PETITION_FORM_ID  — form id from Site → Forms → petition URL
// Plus SITE_ID, which Netlify injects automatically at function runtime.
//
// Endpoint: GET /.netlify/functions/signature-count → { count: <number> }

exports.handler = async function () {
  const token = process.env.NETLIFY_API_TOKEN;
  const formId = process.env.PETITION_FORM_ID;
  const siteId = process.env.SITE_ID;

  if (!token || !formId || !siteId) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Counter is not configured. Need NETLIFY_API_TOKEN, PETITION_FORM_ID, and SITE_ID.',
        haveToken: Boolean(token),
        haveFormId: Boolean(formId),
        haveSiteId: Boolean(siteId)
      })
    };
  }

  const url = `https://api.netlify.com/api/v1/sites/${siteId}/forms/${formId}/submissions?per_page=1`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`signature-count: GET ${url} → ${res.status}`);

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Netlify API returned ${res.status}` })
      };
    }

    const submissions = await res.json();
    let count = Array.isArray(submissions) ? submissions.length : 0;

    // With per_page=1, the "last" page number in the Link header equals the total count.
    const linkHeader = res.headers.get('Link') || res.headers.get('link');
    if (linkHeader) {
      const lastMatch = linkHeader.match(/[?&]page=(\d+)[^>]*>\s*;\s*rel="last"/);
      if (lastMatch) {
        count = parseInt(lastMatch[1], 10);
      }
    }

    console.log(`signature-count: resolved count=${count}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Browser cache for 60s so we don't hammer the API on every page view.
        'Cache-Control': 'public, max-age=60'
      },
      body: JSON.stringify({ count })
    };
  } catch (err) {
    console.log('signature-count: fetch threw', err && err.message);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch signature count' })
    };
  }
};
