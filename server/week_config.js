'use strict';
// ENG06 P-C · Hafta bileti parametreleri (D2).
// YER TUTUCU: Aşağıdaki varsayılanlar onaylı denge değeri DEĞİLDİR. Doluş süresi, tavan ve
// başlangıç bileti 01 Game Design simülasyonuyla belirlenecek (açık karar D2c).
// Ortam değişkeniyle geçersiz kılınabilir (yalnız sunucu yapılandırması; istemci etkileyemez):
//   EO_WEEK_TICKET_REFILL_MS  bir biletin dolma süresi (ms, >= 1000)
//   EO_WEEK_TICKET_CAP        tavan (1..1000)
//   EO_WEEK_TICKET_INITIAL    ilk görülen hesaptaki bilet (0..tavan)
// Geçersiz değer sunucu açılışında hata verir (fail-closed); sessizce varsayılana dönülmez.
// Gerekçe (K6): yavaşlık riski; ölçüm sonrası ayarlanacak.
const PLACEHOLDER_DEFAULTS = Object.freeze({ refillMs: 3 * 60 * 60 * 1000, cap: 8, initial: 6 });

function readTicketConfig(env = process.env) {
  const num = (name, fallback, min, max) => {
    const raw = env[name];
    if (raw === undefined || raw === '') return fallback;
    if (!/^\d+$/.test(String(raw))) throw new Error('invalid_' + name);
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error('invalid_' + name);
    return n;
  };
  const cfg = {
    refillMs: num('EO_WEEK_TICKET_REFILL_MS', PLACEHOLDER_DEFAULTS.refillMs, 1000, 365 * 24 * 60 * 60 * 1000),
    cap: num('EO_WEEK_TICKET_CAP', PLACEHOLDER_DEFAULTS.cap, 1, 1000),
    initial: num('EO_WEEK_TICKET_INITIAL', PLACEHOLDER_DEFAULTS.initial, 0, 1000),
  };
  if (cfg.initial > cfg.cap) throw new Error('invalid_week_ticket_config');
  return Object.freeze(cfg);
}

const TICKETS = readTicketConfig();
module.exports = { PLACEHOLDER_DEFAULTS, readTicketConfig, TICKETS };
