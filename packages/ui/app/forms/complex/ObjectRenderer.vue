<template>
  <div v-if="control.visible">
    <dispatch-renderer
      :visible="control.visible"
      :enabled="control.enabled"
      :schema="control.schema"
      :uischema="detailUiSchema"
      :path="control.path"
      :renderers="control.renderers"
      :cells="control.cells"
    />
  </div>
</template>

<script lang="ts">
import type { ControlElement, GroupLayout, UISchemaElement } from '@jsonforms/core'
import { Generate, findUISchema } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { DispatchRenderer, rendererProps, useJsonFormsControlWithDetail } from '@jsonforms/vue'
import { isEmpty } from 'lodash-es'
import { defineComponent } from 'vue'

import { useVanillaControl } from '../util'

export default defineComponent({
  name: 'ObjectRenderer',
  components: {
    DispatchRenderer,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const control = useVanillaControl(useJsonFormsControlWithDetail(props))
    return {
      ...control,
      input: control,
    }
  },
  computed: {
    detailUiSchema(): UISchemaElement {
      const uiSchemaGenerator = () => {
        const uiSchema = Generate.uiSchema(
          this.control.schema,
          'Group',
          undefined,
          this.control.rootSchema,
        )
        if (isEmpty(this.control.path)) {
          uiSchema.type = 'VerticalLayout'
        } else {
          ;(uiSchema as GroupLayout).label = this.control.label
        }
        return uiSchema
      }

      const result = findUISchema(
        this.control.uischemas,
        this.control.schema,
        this.control.uischema.scope,
        this.control.path,
        uiSchemaGenerator,
        this.control.uischema,
        this.control.rootSchema,
      )

      return result
    },
  },
})
</script>
