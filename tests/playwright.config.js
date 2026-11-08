const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:/(trade_ui|ocak_sandigi|eng09_layout|eng10_economy|eng11_trade|eng12_sync|eng13_sync)\.e2e\.js$/,timeout:120000,expect:{timeout:12000},workers:1,use:{channel:'msedge',headless:true},outputDir:'../test-results/trade-ui'});
