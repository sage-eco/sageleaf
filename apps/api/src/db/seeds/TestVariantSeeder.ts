import { type EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'

import { Source, SourceType } from '@src/changes/source.entity'
import { MATERIAL_IDS } from '@src/db/seeds/TestMaterialSeeder'
import { NORMAL_USER_ID } from '@src/db/seeds/UserSeeder'
import { Component, ComponentsMaterials } from '@src/process/component.entity'
import { Material } from '@src/process/material.entity'
import { Item } from '@src/product/item.entity'
import { Variant, VariantsComponents, VariantsSources } from '@src/product/variant.entity'
import { User } from '@src/users/users.entity'

export const VARIANT_IDS = [
  '_cGUR-e0HHUYQAZTeN6ft',
  '0i9rvrZEznqaGCDGnbhxg',
  'vrdW-cKWZ8xGuVGFCYxz2',
  'kdUHfyjKp6p27lY49AVtg',
  'Li5nxj7hlQ8ArZMWFcYOy',
  '0y7SRRhI2VnC_CzgP_ePI',
  'AdC9idQSNJyDT5lQGV5Fa',
  'Bj9Jvz8kCUs8Ree4kGMc7',
  'tQFWuNfXreUizg8jLMB2j',
  'TlXmWbqomqlrQB1W3Mrhp',
]
export const SOURCE_IDS = [
  '-rzGA3GmEPNXQmeZ2sk7F',
  'BB9KN-G02xsQBvB3ElfYQ',
  'CC9KN-G02xsQBvB3ElfYQ',
  'DD9KN-G02xsQBvB3ElfYQ',
  'EE9KN-G02xsQBvB3ElfYQ',
]
export const ITEM_IDS = [
  'ao9d3DwYb_NEG2bRPhC-f',
  '3JobgyKigxgRnZtOVNBG3',
  '4JobgyKigxgRnZtOVNBG3',
  '5JobgyKigxgRnZtOVNBG3',
  '6JobgyKigxgRnZtOVNBG3',
]
export const COMPONENT_IDS = [
  'p90O7X3yt19lENUJWr-Am',
  'qW9QAqg3WzWAhhmZfKcr_',
  'rW9QAqg3WzWAhhmZfKcr_',
  'sW9QAqg3WzWAhhmZfKcr_',
  'tW9QAqg3WzWAhhmZfKcr_',
]

const ITEM_NAMES = [
  { en: 'Refurbished Smartphone', sv: 'Renoverad smartphone' },
  { en: 'Reclaimed Aluminum Sheet', sv: 'Återvunnen aluminiumplåt' },
  { en: 'Recycled Glass Jar', sv: 'Återvunnen glasburk' },
  { en: 'Upcycled Denim Jacket', sv: 'Uppcyklad jeansjacka' },
  { en: 'Reground Plastic Pellets', sv: 'Omslipade plastpellets' },
]

const COMPONENT_NAMES = [
  { en: 'Lithium Battery Pack', sv: 'Litiumbatteripaket', materialIdx: 0 },
  { en: 'Aluminum Casing', sv: 'Aluminiumhölje', materialIdx: 1 },
  { en: 'Recycled Glass Panel', sv: 'Återvunnen glaspanel', materialIdx: 2 },
  { en: 'Cotton-Blend Lining', sv: 'Bomullsblandad foder', materialIdx: 3 },
  { en: 'Molded Plastic Shell', sv: 'Formgjuten plastskal', materialIdx: 4 },
]

export class TestVariantSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    for (const id of SOURCE_IDS) {
      em.create(Source, {
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: SourceType.IMAGE,
        location: `https://sageleaf.app/source/${id}`,
        user: em.getReference(User, NORMAL_USER_ID!),
      })
    }

    const items: Item[] = []
    for (let i = 0; i < ITEM_IDS.length; i++) {
      const { en, sv } = ITEM_NAMES[i]
      const item = em.create(Item, {
        id: ITEM_IDS[i],
        name: { en, sv },
        desc: {
          en: `${en} sourced for the circular economy catalog.`,
          sv: `${sv} anskaffad för den cirkulära ekonomins katalog.`,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        source: [{ id: SOURCE_IDS[i] }],
      })
      items.push(item)
    }
    try {
      await em.persist(items).flush()
    } catch (error) {
      throw new Error(`Failed to persist items: ${error}`)
    }

    const components: Component[] = []
    for (let i = 0; i < COMPONENT_IDS.length; i++) {
      const { en, sv, materialIdx } = COMPONENT_NAMES[i]
      const component = em.create(Component, {
        id: COMPONENT_IDS[i],
        name: { en, sv },
        desc: {
          en: `${en} used in the manufacture of catalog variants.`,
          sv: `${sv} som används vid tillverkning av katalogvarianter.`,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        primaryMaterial: em.getReference(Material, MATERIAL_IDS[materialIdx]),
      })
      em.create(ComponentsMaterials, {
        component,
        material: em.getReference(Material, MATERIAL_IDS[materialIdx]),
        materialFraction: 1.0,
      })
      components.push(component)
    }

    for (const id of VARIANT_IDS) {
      const variant = new Variant()
      variant.id = id
      variant.name = {
        en: `Variant ${id}`,
        sv: `Beskrivning för Svensk Variant ${id}`,
      }
      variant.desc = {
        en: `Description for Variant ${id}`,
        sv: `Beskrivning för Svensk Variant ${id}`,
      }
      for (const item of items) {
        variant.items.add(item)
      }
      em.persist(variant)
      for (const sourceId of SOURCE_IDS) {
        const source = new VariantsSources()
        source.source = em.getReference(Source, sourceId)
        source.variant = em.getReference(Variant, id)
        source.meta = { test: 'meta' }
        em.persist(source)
        variant.variantSources.add(source)
      }
      for (const componentId of COMPONENT_IDS) {
        const component = new VariantsComponents()
        component.component = em.getReference(Component, componentId)
        component.variant = em.getReference(Variant, id)
        component.quantity = 1
        em.persist(component)
        variant.variantComponents.add(component)
      }
      await em.persist(variant).flush()
    }
  }
}
