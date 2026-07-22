<template>
  <control-wrapper
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
  >
    <div class="flex w-full items-center gap-2">
      <Dialog v-model:open="dialogOpen">
        <DialogTrigger as-child>
          <Button variant="outline" :disabled="!control.enabled">
            {{ control.data ? 'Change' : 'Search' }}
          </Button>
        </DialogTrigger>
        <DialogContent class="max-h-[70vh] overflow-auto">
          <DialogTitle> Upload an image or select an icon </DialogTitle>
          <DialogDescription></DialogDescription>
          <Tabs class="w-full" default-value="image">
            <TabsList aria-label="Manage your account" class="grid w-full grid-cols-2">
              <TabsTrigger value="image"> Image </TabsTrigger>
              <TabsTrigger value="icon"> Icon </TabsTrigger>
            </TabsList>
            <TabsContent value="image" class="my-3 flex justify-center">
              <input
                :id="control.id + '-input'"
                type="file"
                class="file-input file-input-md"
                :disabled="!control.enabled"
                :autofocus="appliedOptions.focus"
                :placeholder="appliedOptions.placeholder"
                @change="onChange"
                @focus="isFocused = true"
                @blur="isFocused = false"
              />
            </TabsContent>
            <TabsContent value="icon" class="mx-3">
              <FormInput
                v-model:model-value="iconSearchInput"
                class="w-full"
                placeholder="Search for an icon"
              />
              <div class="my-4 grid grid-cols-4">
                <div
                  v-for="icon in iconResult?.icons || []"
                  :key="icon"
                  @click="onIconSelect(icon)"
                >
                  <UiImage :src="'icon://' + icon" class="h-12 w-12" :alt="icon" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      <div v-if="control.data">
        <UiImage :src="control.data" :alt="control.label" class="h-16 w-16 object-cover" />
      </div>
    </div>
  </control-wrapper>
</template>

<script lang="ts">
import type { ControlElement } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { watchDebounced } from '@vueuse/core'
import { defineComponent } from 'vue'

import { useVanillaControl } from '../util'
// eslint-disable-next-line import/no-named-default
import { default as ControlWrapper } from './ControlWrapper.vue'

export default defineComponent({
  name: 'ImageControlRenderer',
  components: {
    ControlWrapper,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const input = useJsonFormsControl(props)
    const dialogOpen = ref<boolean>(false)
    const iconSearchInput = ref<string>('')
    const iconResult = ref<{ icons: string[] } | null>(null)
    watchDebounced(
      iconSearchInput,
      async (newValue) => {
        if (newValue) {
          const icons = await $fetch(
            // At some point host our local search API
            //runtimeConfig.public.baseurl + `/api/icons/search`,
            'https://api.iconify.design/search',
            {
              method: 'GET',
              query: { query: newValue, limit: 32 },
            },
          )
          iconResult.value = icons as { icons: string[] }
        }
      },
      {
        debounce: 800,
      },
    )
    const onIconSelect = (icon: string) => {
      input.handleChange(input.control.value.path, `icon://${icon.replace(':', '/')}`)
      dialogOpen.value = false
    }
    return useVanillaControl(
      { ...input, dialogOpen, iconSearchInput, iconResult, onIconSelect },
      (target) => target.value,
    )
  },
  computed: {
    dataTime(): string {
      return (this.control.data ?? '').slice(0, 16)
    },
  },
})
</script>
