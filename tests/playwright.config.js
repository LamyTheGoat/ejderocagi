const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:/(trade_ui|ocak_sandigi|eng09_layout|zindan_gate|b5_0_npc_labels|mobile_ux|eng10_economy|eng11_trade|eng12_sync|eng13_sync|eng14_pvp)\.e2e\.js$/,timeout:120000,expect:{timeout:12000},workers:1,use:{channel:'msedge',headless:true},outputDir:'../test-results/trade-ui'});
