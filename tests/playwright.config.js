const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({testDir:__dirname,testMatch:'trade_ui.e2e.js',timeout:60000,workers:1,use:{channel:'msedge',headless:true},outputDir:'../test-results/trade-ui'});
