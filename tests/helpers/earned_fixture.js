'use strict';
// Trusted test setup only. No production route imports or exposes this helper.
function earnedFixture(game) {
 game.funds={schema:1,bound:0,unknown:0,earned:game.gold};
 game.foodSources=Object.fromEntries(Object.entries(game.food).map(([k,n])=>[k,{bound:0,unknown:0,earned:n}]));
 for(const rows of [game.inv,game.dragons,game.eggs])for(const row of rows)row.funding='earned';
 return game;
}
function seedSQLite(filename,accountId) {
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(filename);
 try {const rows=accountId?db.prepare('SELECT * FROM game_states WHERE account_id=?').all(accountId):db.prepare('SELECT * FROM game_states').all();
  for(const row of rows)db.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(earnedFixture(JSON.parse(row.game_json))),row.account_id);
 }finally{db.close();}
}
module.exports={earnedFixture,seedSQLite};
