import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  browser: 'edge',
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Job Application Tracker',
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: {
          id: 'job-application-tracker@sehaziq',
          strict_min_version: '147.0',
          data_collection_permissions: { required: ['none'] },
        },
      },
    } : { minimum_chrome_version: '120' }),
    permissions: ['storage', 'activeTab', 'scripting', 'alarms'],
    action: {
      default_icon: { 16: 'icon-muted/16.png', 32: 'icon-muted/32.png', 48: 'icon-muted/48.png' },
    },
  }),
  vite: ({ browser, mode }) => ({
    plugins: browser === 'firefox' && mode === 'production' ? [{
      name: 'firefox-disable-runtime-html-and-jit',
      enforce: 'pre',
      transform(code, id) {
        const path = id.replaceAll('\\', '/');
        if (path.endsWith('/zod/v4/core/util.js')) {
          // Always use Zod's CSP-safe validation path without probing the Function constructor.
          const updated = code.replace(/export const allowsEval = \/\* @__PURE__\*\/ cached\(\(\) => \{[\s\S]*?\n\}\);/, 'export const allowsEval = { value: false };');
          if (updated === code) this.error('Recheck the Firefox Zod transform after upgrading Zod.');
          return updated;
        }
        if (path.endsWith('/zod/v4/core/doc.js')) {
          const updated = code.replace(/    compile\(\) \{[\s\S]*?\n    \}/,
            '    compile() { throw Error("Runtime schema compilation is disabled in this extension."); }');
          if (updated === code) this.error('Recheck the Firefox Zod compiler transform after upgrading Zod.');
          return updated;
        }
        if (path.endsWith('/react-dom/cjs/react-dom-client.production.js')) {
          // This extension renders text and DOM nodes. Reject React's raw HTML prop in Firefox builds.
          const assignment = '(domElement.innerHTML = key);';
          if (code.split(assignment).length !== 3) this.error('Recheck the Firefox React transform after upgrading React DOM.');
          return code.replaceAll(assignment, '(() => { throw Error("Raw HTML is disabled in this extension."); })();');
        }
      },
    }] : [],
  }),
  zip: {
    includeSources: ['package.json', 'package-lock.json', 'wxt.config.ts', 'tsconfig.json', 'entrypoints/**/*', 'lib/**/*', 'public/**/*', 'ui/**/*'],
  },
});
