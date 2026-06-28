<script lang="ts">
  import { dbStore } from '$lib/stores/db.svelte';
  import { encryptText, decryptText } from '@watchnt/ai';

  let passphrase = $state('');
  let confirmedPassphrase = $state('');
  let isUnlocked = $state(false);
  let unlockError = $state('');

  let openaiKey = $state('');
  let anthropicKey = $state('');
  let geminiKey = $state('');
  
  let showPassphraseSetup = $state(false);

  // Attempt to check if keys already exist to show the unlock screen
  $effect(() => {
    if (dbStore.settings) {
      dbStore.settings.get('byok_openai').then(res => {
        if (res && res.value) {
          // A key exists, we need passphrase to unlock
        } else {
          showPassphraseSetup = true;
        }
      });
    }
  });

  async function handleUnlock() {
    if (!dbStore.settings) return;
    try {
      unlockError = '';
      const oaiRes = await dbStore.settings.get('byok_openai');
      if (oaiRes && oaiRes.value) {
        const payload = JSON.parse(oaiRes.value as string);
        await decryptText(payload, passphrase); // Will throw if wrong passphrase
        openaiKey = 'sk-... (Redacted)';
      }
      
      const anthRes = await dbStore.settings.get('byok_anthropic');
      if (anthRes && anthRes.value) {
        anthropicKey = 'sk-... (Redacted)';
      }
      
      const gemRes = await dbStore.settings.get('byok_gemini');
      if (gemRes && gemRes.value) {
        geminiKey = 'sk-... (Redacted)';
      }
      
      isUnlocked = true;
    } catch (err) {
      unlockError = 'Incorrect passphrase or corrupted keys.';
    }
  }

  async function handleSetup() {
    if (passphrase !== confirmedPassphrase) {
      unlockError = 'Passphrases do not match.';
      return;
    }
    if (passphrase.length < 8) {
      unlockError = 'Passphrase must be at least 8 characters.';
      return;
    }
    isUnlocked = true;
    showPassphraseSetup = false;
  }

  async function saveKey(provider: string, keyVal: string) {
    if (!dbStore.settings || !keyVal || keyVal.startsWith('sk-...')) return;
    
    try {
      const encrypted = await encryptText(keyVal, passphrase);
      await dbStore.settings.set(`byok_${provider}`, JSON.stringify(encrypted));
      
      // Mask it in UI
      if (provider === 'openai') openaiKey = 'sk-... (Redacted)';
      if (provider === 'anthropic') anthropicKey = 'sk-... (Redacted)';
      if (provider === 'gemini') geminiKey = 'sk-... (Redacted)';
      
      alert(`${provider} key saved securely!`);
    } catch (err) {
      alert(`Failed to save key: ${err}`);
    }
  }
</script>

<svelte:head>
  <title>Settings - Watch'nt</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 py-8">
  <div class="mb-6 flex justify-between items-center">
    <a href="/" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
      &larr; Back to Home
    </a>
    <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
  </div>
  
  <p class="text-gray-500 mb-8">Configure your local models, Bring Your Own Key (BYOK), and other preferences.</p>

  <div class="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
    <div class="px-4 py-5 sm:px-6">
      <h3 class="text-lg leading-6 font-medium text-gray-900">AI Providers (BYOK)</h3>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        Cloud providers are strictly opt-in. API keys are encrypted using Web Crypto AES-GCM on your device.
      </p>
    </div>
    
    <div class="border-t border-gray-200 px-4 py-5 sm:px-6">
      {#if !isUnlocked}
        {#if showPassphraseSetup}
          <div class="max-w-md">
            <h4 class="text-md font-medium text-gray-900 mb-2">Set Master Passphrase</h4>
            <p class="text-sm text-gray-500 mb-4">You need a master passphrase to securely encrypt your API keys. Do not lose this!</p>
            
            <input type="password" bind:value={passphrase} placeholder="Passphrase (min 8 chars)" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-3 px-3 py-2 border">
            <input type="password" bind:value={confirmedPassphrase} placeholder="Confirm Passphrase" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-3 px-3 py-2 border">
            
            {#if unlockError}<p class="text-red-500 text-sm mb-3">{unlockError}</p>{/if}
            
            <button onclick={handleSetup} class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
              Set Passphrase
            </button>
          </div>
        {:else}
          <div class="max-w-md">
            <h4 class="text-md font-medium text-gray-900 mb-2">Unlock Settings</h4>
            <p class="text-sm text-gray-500 mb-4">Enter your master passphrase to unlock your API keys.</p>
            
            <input type="password" bind:value={passphrase} placeholder="Master Passphrase" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-3 px-3 py-2 border">
            
            {#if unlockError}<p class="text-red-500 text-sm mb-3">{unlockError}</p>{/if}
            
            <button onclick={handleUnlock} class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
              Unlock
            </button>
          </div>
        {/if}
      {:else}
        <div class="space-y-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between">
            <div class="mb-2 md:mb-0">
              <h4 class="text-sm font-medium text-gray-900">OpenAI API Key</h4>
              <p class="text-xs text-gray-500">Used for transcript generation and advanced queries if selected.</p>
            </div>
            <div class="flex w-full md:w-auto gap-2">
              <input type="password" bind:value={openaiKey} placeholder="sk-..." class="block w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
              <button onclick={() => saveKey('openai', openaiKey)} class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Save</button>
            </div>
          </div>

          <div class="flex flex-col md:flex-row md:items-center justify-between">
            <div class="mb-2 md:mb-0">
              <h4 class="text-sm font-medium text-gray-900">Anthropic API Key</h4>
              <p class="text-xs text-gray-500">Used for Claude-based summarization and extraction if selected.</p>
            </div>
            <div class="flex w-full md:w-auto gap-2">
              <input type="password" bind:value={anthropicKey} placeholder="sk-ant-..." class="block w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
              <button onclick={() => saveKey('anthropic', anthropicKey)} class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Save</button>
            </div>
          </div>

          <div class="flex flex-col md:flex-row md:items-center justify-between">
            <div class="mb-2 md:mb-0">
              <h4 class="text-sm font-medium text-gray-900">Google Gemini API Key</h4>
              <p class="text-xs text-gray-500">Used for Gemini models if selected.</p>
            </div>
            <div class="flex w-full md:w-auto gap-2">
              <input type="password" bind:value={geminiKey} placeholder="AIzaSy..." class="block w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border">
              <button onclick={() => saveKey('gemini', geminiKey)} class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">Save</button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
