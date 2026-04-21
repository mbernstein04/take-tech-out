// Netlify Function: returns the current submission count for the petition form.
// Expects two environment variables set in the Netlify dashboard:
//   NETLIFY_API_TOKEN — a personal access token with "Forms: read" scope
//   PETITION_FORM_ID  — the form id from Site → Forms → (form name) URL
//
// Endpoint: GET /.netlify/functions/signature-count → { count: <number> }

exports.handler = async function () {
  const token = process.env.NETLIFY_API_TOKEN;
  const formId = process.env.PETITION_FORM_ID;

  if (!token || !formId) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Counter is not configured. Set NETLIFY_API_TOKEN and PETITION_FORM_ID.' })
    };
  }

  try {
    const res = await fetch(`https://api.netlify.com/api/v1/forms/${formId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Netlify API returned ${res.status}` })
      };
    }

    const form = await res.json();
    const count = typeof form.submission_count === 'number' ? form.submission_count : 0;

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
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch signature count' })
    };
  }
};
