import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html', // 👈 ఈ లైన్ Cloudflare SPA రూటింగ్ ఎర్రర్‌ను పూర్తిగా ఫిక్స్ చేస్తుంది
			precompress: false,
			strict: false
		})
	}
};

export default config;