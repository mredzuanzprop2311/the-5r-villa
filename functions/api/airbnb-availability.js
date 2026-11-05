export async function onRequestGet({ env }) {
  const url = env.AIRBNB_ICAL_URL;

  const json = (statusCode, body) => new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "Content-Type"
    }
  });

  if (!url) {
    return json(500, {error:"AIRBNB_ICAL_URL environment variable belum diset pada project Calendar."});
  }

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":"THE-5R-VILLA-Public-Calendar-AutoSync/2.9",
        "accept":"text/calendar,text/plain;q=0.9,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      return json(502, {error:`Airbnb iCal fetch gagal: HTTP ${response.status}`});
    }

    let ics = await response.text();
    ics = ics.replace(/\r?\n[ \t]/g,"");

    const blocks = ics.split("BEGIN:VEVENT").slice(1);
    const events = [];

    const toIsoDate = value => {
      if(!value) return null;
      const m=value.match(/(\d{4})(\d{2})(\d{2})/);
      return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
    };

    for(const block of blocks){
      const eventText=block.split("END:VEVENT")[0];

      const dtStart=(eventText.match(/^DTSTART(?:;[^:]*)?:(.+)$/m)||[])[1]?.trim();
      const dtEnd=(eventText.match(/^DTEND(?:;[^:]*)?:(.+)$/m)||[])[1]?.trim();

      const checkIn=toIsoDate(dtStart);
      const checkOut=toIsoDate(dtEnd);

      if(!checkIn || !checkOut) continue;

      // Public endpoint returns dates only.
      events.push({checkIn,checkOut});
    }

    return json(200,{
      source:"Airbnb",
      count:events.length,
      events
    });
  } catch(error) {
    return json(502,{error:"Sambungan ke Airbnb iCal gagal."});
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "Content-Type"
    }
  });
}
