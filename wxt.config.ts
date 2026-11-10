import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  browser: 'chrome',
  manifestVersion: 3,
  manifest: {
    name: 'Job Application Tracker',
    minimum_chrome_version: '120',
    permissions: ['storage', 'activeTab', 'scripting', 'alarms'],
    action: {
      default_icon: { 16: 'icon-muted/16.png', 32: 'icon-muted/32.png', 48: 'icon-muted/48.png' },
    },
  },
});
