import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
    compilerOptions: {
        runes: true
    },
	kit: {
		appDir: 'app', // Fix for Chrome Extensions: cannot use '_app'
        adapter: adapter({
            fallback: 'index.html',
            strict: false
        })
	}
};

export default config;
