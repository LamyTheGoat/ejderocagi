'use strict';
// ENG06 P-D · Ejderha Düellosu ödül politikası parametreleri (K9 Sybil, K10 forfeit).
// YER TUTUCU: Aşağıdaki sınırlar onaylı denge değeri DEĞİLDİR; ölçüm sonrası 01 Game Design ayarlar.
// Ortam değişkeniyle geçersiz kılınabilir (yalnız sunucu yapılandırması; istemci etkileyemez):
//   EO_DUEL_PAIR_DAILY_LIMIT      aynı iki hesap arasında UTC günü başına ödüllü maç (0..1000)
//   EO_DUEL_ACCOUNT_DAILY_LIMIT   hesap başına UTC günü başına ödüllü maç (0..1000)
//   EO_DUEL_FORFEIT_MIN_ROUNDS    terk/teslimle biten maçta kazananın ödül alması için en az oynanmış tur (0..30)
//   EO_DUEL_MATCH_TTL_MS          ödüllü maç kaydının ve ejderha kilidinin ömrü (ms); aşılırsa maç `void`, ödül yok
// Geçersiz değer sunucu açılışında hata verir (fail-closed); sessizce varsayılana dönülmez.
const PLACEHOLDER_DEFAULTS = Object.freeze({ pairDailyLimit: 3, accountDailyLimit: 10, forfeitMinRounds: 3, matchTtlMs: 60 * 60 * 1000 });

// Ödül TUTARLARI mevcut istemci kodunun birebir taşınmasıdır (js/net.js finishMpFight,
// js/dragon_duel.js `rewardGold: 85`): zafer 85, beraberlik 35, yenilgi 20. Ortamdan DEĞİŞTİRİLEMEZ.
// İstemcideki çarpanlar (dünya olayı `raidMult`, Divan `gladyator`, bahis `FT.bet`) uygulanmaz: açık karar A-10.
const DUEL_REWARDS = Object.freeze({ win: 85, draw: 35, loss: 20 });
const RULE_VERSION = 'dragon_duel/1';

function readDuelConfig(env = process.env) {
  const num = (name, fallback, min, max) => {
    const raw = env[name];
    if (raw === undefined || raw === '') return fallback;
    if (!/^\d+$/.test(String(raw))) throw new Error('invalid_' + name);
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error('invalid_' + name);
    return n;
  };
  return Object.freeze({
    pairDailyLimit: num('EO_DUEL_PAIR_DAILY_LIMIT', PLACEHOLDER_DEFAULTS.pairDailyLimit, 0, 1000),
    accountDailyLimit: num('EO_DUEL_ACCOUNT_DAILY_LIMIT', PLACEHOLDER_DEFAULTS.accountDailyLimit, 0, 1000),
    forfeitMinRounds: num('EO_DUEL_FORFEIT_MIN_ROUNDS', PLACEHOLDER_DEFAULTS.forfeitMinRounds, 0, 30),
    matchTtlMs: num('EO_DUEL_MATCH_TTL_MS', PLACEHOLDER_DEFAULTS.matchTtlMs, 60_000, 24 * 60 * 60 * 1000),
  });
}

const DUEL = readDuelConfig();
module.exports = { PLACEHOLDER_DEFAULTS, DUEL_REWARDS, RULE_VERSION, readDuelConfig, DUEL };
