import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html', // 👈 Cloudflare Pages SPA కి ఇది ఖచ్చితంగా 404.html అయి ఉండాలి
			precompress: false,
			strict: false
		})
	}
};

export default config;