<script lang="ts">
	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-900 text-white font-sans">
	<nav class="border-b border-gray-800 p-4">
		<div class="container mx-auto flex items-center justify-between">
			<a href="/" class="text-xl font-bold text-blue-400">WatchNT</a>
			<div class="flex gap-4">
				<a href="/import" class="hover:text-blue-300">Import</a>
				<a href="/library" class="hover:text-blue-300">Library</a>
				<a href="/search" class="hover:text-blue-300">Search</a>
				<a href="/graph" class="hover:text-blue-300">Graph</a>
				<a href="/settings" class="hover:text-blue-300">Settings</a>
			</div>
		</div>
	</nav>

	<main class="container mx-auto p-4 py-8">
		{@render children()}
	</main>
</div>
