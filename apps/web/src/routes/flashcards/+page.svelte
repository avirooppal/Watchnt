<script lang="ts">
  import { dbStore } from '$lib/stores/db.svelte';
  import { isSuccess } from '@watchnt/shared';

  let flashcards = $state<any[]>([]);
  let currentCardIndex = $state(0);
  let showAnswer = $state(false);
  let loading = $state(true);

  let currentCard = $derived(flashcards[currentCardIndex]);

  $effect(() => {
    if (dbStore.facade) {
      dbStore.facade.flashcards.getDueFlashcards(50).then(res => {
        if (isSuccess(res)) {
          flashcards = res.value.map(c => {
            const front = JSON.parse(c.front_data);
            const back = JSON.parse(c.back_data);
            return {
              ...c,
              question: front.question,
              answer: back.answer
            };
          });
        }
        loading = false;
      });
    }
  });

  async function handleReview(quality: number) {
    if (!currentCard || !dbStore.facade) return;
    
    // Simple spaced repetition mock: 
    // quality 0-2: due immediately, 3: due in 1 min, 4: due in 10 mins, 5: due in 1 hour
    let nextOffset = 0;
    if (quality === 3) nextOffset = 60 * 1000;
    else if (quality === 4) nextOffset = 10 * 60 * 1000;
    else if (quality === 5) nextOffset = 60 * 60 * 1000;

    await dbStore.facade.flashcards.updateNextReview(currentCard.id, Date.now() + nextOffset);

    // Move to next card
    showAnswer = false;
    currentCardIndex++;
  }
</script>

<svelte:head>
  <title>Flashcard Review - Watch'nt</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8">
  <div class="mb-6 flex justify-between items-center">
    <a href="/" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center">
      &larr; Back to Home
    </a>
    <h1 class="text-2xl font-bold text-gray-900">Review Flashcards</h1>
  </div>

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  {:else if flashcards.length === 0 || currentCardIndex >= flashcards.length}
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <div class="text-4xl mb-4">🎉</div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">You're all caught up!</h2>
      <p class="text-gray-500">No due flashcards at the moment. Add more videos or wait for the next review session.</p>
    </div>
  {:else}
    <div class="mb-4 text-sm font-medium text-gray-500 text-center">
      Card {currentCardIndex + 1} of {flashcards.length}
    </div>
    
    <!-- Flashcard -->
    <div class="bg-white rounded-xl shadow-lg border border-gray-200 min-h-[300px] flex flex-col perspective-1000">
      <!-- Front -->
      <div class="flex-1 p-8 md:p-12 flex flex-col justify-center items-center text-center">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">{currentCard.question}</h3>
        
        {#if !showAnswer}
          <button 
            class="mt-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors w-full md:w-auto"
            onclick={() => showAnswer = true}
          >
            Show Answer
          </button>
        {/if}
      </div>

      <!-- Back (Answer) -->
      {#if showAnswer}
        <div class="border-t border-gray-100 bg-gray-50 p-8 md:p-12 flex flex-col justify-center items-center text-center rounded-b-xl animate-fade-in">
          <p class="text-xl text-gray-700 mb-8">{currentCard.answer}</p>
          
          <div class="w-full">
            <p class="text-sm text-gray-500 mb-3 font-medium uppercase tracking-wider">How well did you know this?</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button onclick={() => handleReview(1)} class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded transition-colors">Again</button>
              <button onclick={() => handleReview(3)} class="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium rounded transition-colors">Hard</button>
              <button onclick={() => handleReview(4)} class="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded transition-colors">Good</button>
              <button onclick={() => handleReview(5)} class="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded transition-colors">Easy</button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
