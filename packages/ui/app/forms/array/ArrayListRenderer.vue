<template>
  <fieldset v-if="control.visible" :class="styles.arrayList.root">
    <legend :class="styles.arrayList.legend">
      <label :class="styles.arrayList.label">
        {{ control.label }}
      </label>
      <button
        :class="styles.arrayList.addButton"
        type="button"
        :disabled="!control.enabled || (appliedOptions.restrict && maxItemsReached)"
        @click="addButtonClick"
      >
        +
      </button>
    </legend>
    <div
      v-for="(element, index) in control.data"
      :key="`${control.path}-${index}`"
      :class="styles.arrayList.itemWrapper"
    >
      <array-list-element
        v-if="!isRefList"
        :move-shown="!control.uischema.options || control.uischema.options.showSortButtons"
        :move-up="moveUp ? moveUp(control.path, index as number) : undefined"
        :move-up-enabled="control.enabled && (index as number) > 0"
        :move-down="moveDown ? moveDown(control.path, index as number) : undefined"
        :move-down-enabled="control.enabled && (index as number) < control.data.length - 1"
        :delete-enabled="control.enabled && !minItemsReached"
        :delete="removeItems ? removeItems(control.path, [index as number]) : undefined"
        :label="childLabelForIndex(index as number)"
        :styles="styles"
      >
        <dispatch-renderer
          :schema="control.schema"
          :uischema="childUiSchema"
          :path="composePaths(control.path, `${index}`)"
          :enabled="control.enabled"
          :renderers="control.renderers"
          :cells="control.cells"
        />
      </array-list-element>
      <array-list-ref-element
        v-if="isRefList"
        :delete-enabled="control.enabled && !minItemsReached"
        :delete="removeItems ? removeItems(control.path, [index as number]) : undefined"
        :label="childLabelForIndex(index as number)"
        :styles="styles"
      >
        <dispatch-renderer
          :schema="control.schema"
          :uischema="childUiSchema"
          :path="composePaths(control.path, `${index}`)"
          :enabled="control.enabled"
          :renderers="control.renderers"
          :cells="control.cells"
        />
      </array-list-ref-element>
    </div>
    <div v-if="noData" :class="styles.arrayList.noData">
      {{ translations.noDataMessage }}
    </div>
  </fieldset>
</template>

<script lang="ts">
import type { ControlElement, JsonSchema, JsonFormsSubStates } from '@jsonforms/core'
import {
  composePaths,
  createDefaultValue,
  Resolve,
  arrayDefaultTranslations,
  getArrayTranslations,
  defaultJsonFormsI18nState,
} from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { DispatchRenderer, rendererProps, useJsonFormsArrayControl } from '@jsonforms/vue'
import { has, isObjectLike, keys } from 'lodash-es'
import { defineComponent, inject } from 'vue'

import { useVanillaArrayControl } from '../util'
import ArrayListElement from './ArrayListElement.vue'
import ArrayListRefElement from './ArrayListRefElement.vue'

export default defineComponent({
  name: 'ArrayListRenderer',
  components: {
    ArrayListElement,
    ArrayListRefElement,
    DispatchRenderer,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    return useVanillaArrayControl(useJsonFormsArrayControl(props))
  },
  computed: {
    noData(): boolean {
      return !this.control.data || this.control.data.length === 0
    },
    arraySchema(): JsonSchema | undefined {
      return Resolve.schema(this.schema, this.control.uischema.scope, this.control.rootSchema)
    },
    maxItemsReached(): boolean | undefined {
      return (
        this.arraySchema !== undefined &&
        this.arraySchema.maxItems !== undefined &&
        this.control.data !== undefined &&
        this.control.data.length >= this.arraySchema.maxItems
      )
    },
    minItemsReached(): boolean | undefined {
      return (
        this.arraySchema !== undefined &&
        this.arraySchema.minItems !== undefined &&
        this.control.data !== undefined &&
        this.control.data.length <= this.arraySchema.minItems
      )
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    translations(): any {
      const jsonforms = inject<JsonFormsSubStates>('jsonforms')
      return getArrayTranslations(
        jsonforms?.i18n?.translate ?? defaultJsonFormsI18nState.translate,
        arrayDefaultTranslations,
        this.control.i18nKeyPrefix,
        this.control.label,
      )
    },
    isRefList(): boolean | undefined {
      return (
        this.arraySchema !== undefined &&
        this.arraySchema.items &&
        isObjectLike(this.arraySchema.items) &&
        (this.arraySchema.items as JsonSchema).type === 'object' &&
        keys((this.arraySchema.items as JsonSchema).properties).length === 1 &&
        has(this.arraySchema.items, 'properties.id.$ref')
      )
    },
  },
  methods: {
    composePaths,
    createDefaultValue,
    addButtonClick() {
      this.addItem(
        this.control.path,
        createDefaultValue(this.control.schema, this.control.rootSchema),
      )()
    },
  },
})
</script>
