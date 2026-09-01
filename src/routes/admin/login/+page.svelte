<script>
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let email = '';
	let password = '';
	let loading = false;
	let errorMsg = '';

	onMount(async () => {
		const { data: { session } } = await supabase.auth.getSession();
		if (session) {
			goto('/admin/news');
		}
	});

	async function handleLogin() {
		loading = true;
		errorMsg = '';

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (error) throw error;
			if (data.session) {
				goto('/admin/news');
			}
		} catch (/** @type {any} */ err) {
			errorMsg = err.message || 'లాగిన్ విఫలమైంది. వివరాలు తనిఖీ చేయండి.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin Login | NS News</title>
</svelte:head>

<div class="min-h-screen bg-slate-950 flex items-center justify-center px-4 font-sans">
	<div class="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl space-y-6 border border-slate-200">
		<div class="text-center space-y-2">
			<div class="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white mx-auto shadow-lg shadow-red-600/30">
				NS
			</div>
			<h2 class="text-2xl font-black text-slate-900 tracking-tight">అడ్మిన్ లాగిన్</h2>
			<p class="text-xs text-slate-500 font-medium">NS News Smart Control Desk</p>
		</div>

		{#if errorMsg}
			<div class="bg-rose-50 text-rose-700 p-3.5 rounded-xl text-xs font-bold border border-rose-200">
				{errorMsg}
			</div>
		{/if}

		<form on:submit|preventDefault={handleLogin} class="space-y-4">
			<div>
				<label for="admin-email" class="block text-xs font-bold text-slate-700 mb-1.5">ఈమెయిల్ అడ్రస్</label>
				<input
					id="admin-email"
					type="email"
					bind:value={email}
					placeholder="admin@example.com"
					class="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-red-600 focus:outline-none"
					required
				/>
			</div>

			<div>
				<label for="admin-password" class="block text-xs font-bold text-slate-700 mb-1.5">పాస్‌వర్డ్</label>
				<input
					id="admin-password"
					type="password"
					bind:value={password}
					placeholder="••••••••"
					class="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-red-600 focus:outline-none"
					required
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-600/30 transition-all text-sm active:scale-95"
			>
				{loading ? 'ధృవీకరిస్తోంది...' : 'లాగిన్ అవ్వండి'}
			</button>
		</form>

		<div class="text-center">
			<a href="/news" class="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors">
				← న్యూస్ పోర్టల్‌కి తిరిగి వెళ్లండి
			</a>
		</div>
	</div>
</div>