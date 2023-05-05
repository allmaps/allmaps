<script lang="ts">
  // import {
  //   renderOptions,
  //   renderOptionsScope
  // } from '$lib/shared/stores/render-options'
</script>

<!-- <div
  id="dropdownNotification"
  class="z-20 w-full max-w-sm bg-white divide-y divide-gray-100 rounded-lg shadow dark:bg-gray-800 dark:divide-gray-700"
  aria-labelledby="dropdownNotificationButton"
>
  <div
    class="block px-4 py-2 font-medium text-center text-gray-700 rounded-t-lg bg-gray-50 dark:bg-gray-800 dark:text-white"
  >
    Render options
  </div>

  <ul
    class="overflow-y-auto p-3 space-y-1 text-sm text-gray-700 dark:text-gray-200 divide-gray-100"
    aria-labelledby="dropdownToggleButton"
  >
    <li>
      <div>
        <label
          for="default-range"
          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >Opacity</label
        >
        <input
          id="default-range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          bind:value={$renderOptions.opacity}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
      </div>
    </li>
    <li>
      <div class="flex p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
        <label class="relative inline-flex items-center w-full cursor-pointer">
          <input
            type="checkbox"
            bind:checked={$renderOptions.removeBackground.enabled}
            class="sr-only peer"
          />
          <div
            class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-500 peer-checked:bg-blue-600"
          />
          <span
            class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300"
            >Remove background color</span
          >
        </label>
      </div>
      <div>
        <label
          for="default-range"
          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >Color</label
        >
        <input
          id="default-range"
          type="color"
          bind:value={$renderOptions.removeBackground.color}
          class=""
        />
      </div>
      <div>
        <label
          for="default-range"
          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >Threshold</label
        >
        <input
          id="default-range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          bind:value={$renderOptions.removeBackground.threshold}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
      </div>
      <div>
        <label
          for="default-range"
          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >Hardness</label
        >
        <input
          id="default-range"
          type="range"
          min="0"
          max="1"
          step="0.01"
          bind:value={$renderOptions.removeBackground.hardness}
          class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
      </div>
    </li>

    <li>
      <div class="flex p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
        <label class="relative inline-flex items-center w-full cursor-pointer">
          <input
            type="checkbox"
            bind:checked={$renderOptions.colorize.enabled}
            class="sr-only peer"
          />
          <div
            class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-500 peer-checked:bg-blue-600"
          />
          <span
            class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300"
            >Colorize</span
          >
        </label>
      </div>

      <div>
        <label
          for="default-range"
          class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >Color</label
        >
        <input
          id="default-range"
          type="color"
          bind:value={$renderOptions.colorize.color}
          class=""
        />
      </div>
    </li>

    <li>
      <h3 class="mb-4 font-semibold text-gray-900 dark:text-white">
        Apply settings to:
      </h3>
      <ul
        class="items-center w-full text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg sm:flex dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
        <li
          class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600"
        >
          <div class="flex items-center pl-3">
            <input
              id="horizontal-list-radio-license"
              type="radio"
              bind:group={$renderOptionsScope}
              value="layer"
              name="list-radio"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
            />
            <label
              for="horizontal-list-radio-license"
              class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
              >All maps
            </label>
          </div>
        </li>
        <li
          class="w-full border-b border-gray-200 sm:border-b-0 sm:border-r dark:border-gray-600"
        >
          <div class="flex items-center pl-3">
            <input
              id="horizontal-list-radio-id"
              type="radio"
              bind:group={$renderOptionsScope}
              value="map"
              name="list-radio"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-700 dark:focus:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
            />
            <label
              for="horizontal-list-radio-id"
              class="w-full py-3 ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
              >Selection</label
            >
          </div>
        </li>
      </ul>
    </li>
  </ul>

  <a
    href="#"
    class="flex items-center p-3 text-sm font-medium text-red-600 border-t border-gray-200 rounded-b-lg bg-gray-50 dark:border-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-red-500 hover:underline"
  >
    <svg
      class="w-5 h-5 mr-1"
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      ><path
        d="M11 6a3 3 0 11-6 0 3 3 0 016 0zM14 17a6 6 0 00-12 0h12zM13 8a1 1 0 100 2h4a1 1 0 100-2h-4z"
      /></svg
    >
    Delete user
  </a>
</div> -->
