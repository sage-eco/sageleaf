import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'

import { Category, CATEGORY_ROOT, CategoryEdge, CategoryTree } from '@src/product/category.entity'

export const CATEGORY_IDS = [
  'rWZhsnlF746r0xche6pU2',
  '0spGwKrzS4dSdO_kORI0i',
  'tLqokjJFOPFmdnZLo3Y_g',
  'hiDAwSu6g3dLjfA7EgfCd',
  'JebNTpoWn_3bM_8G5V1O1',
  'k3Nf8T3pwPHaqNTdx2YcW',
  '07LjdPkbWhjygNv_cNsBz',
  'cuo0g3KuSpKDCgVpUw3To',
  'i7NClSsjSS4Ovv6YpF5p8',
  'pm4maU4xpMy8YQ9ewVC_6',
]

export class TestCategorySeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    let root = await em.findOne(Category, CATEGORY_ROOT)
    if (!root) {
      root = em.create(Category, {
        id: CATEGORY_ROOT,
        name: { xx: CATEGORY_ROOT },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
    // Create top-level categories
    const packaging = em.create(Category, {
      id: CATEGORY_IDS[0],
      name: { en: 'Packaging', sv: 'Förpackning' },
      desc: {
        en: 'Items used to contain or protect products',
        sv: 'Föremål som används för att innehålla eller skydda produkter',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const electronics = em.create(Category, {
      id: CATEGORY_IDS[1],
      name: { en: 'Electronics', sv: 'Elektronik' },
      desc: {
        en: 'Devices or components powered by electricity',
        sv: 'Apparater eller komponenter som drivs av elektricitet',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create mid-level categories
    const bottles = em.create(Category, {
      id: CATEGORY_IDS[2],
      name: { en: 'Bottles', sv: 'Flaskor' },
      desc: { en: 'Containers for liquids', sv: 'Behållare för vätskor' },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const phones = em.create(Category, {
      id: CATEGORY_IDS[3],
      name: { en: 'Phones', sv: 'Telefoner' },
      desc: {
        en: 'Mobile communication devices',
        sv: 'Mobila kommunikationsenheter',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const computers = em.create(Category, {
      id: CATEGORY_IDS[4],
      name: { en: 'Computers', sv: 'Datorer' },
      desc: {
        en: 'Electronic devices for processing data',
        sv: 'Elektroniska enheter för databehandling',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const cans = em.create(Category, {
      id: CATEGORY_IDS[5],
      name: { en: 'Cans', sv: 'Burkar' },
      desc: {
        en: 'Rigid metal containers for food or drink',
        sv: 'Styva metallbehållare för mat eller dryck',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create leaf categories
    const glassBottles = em.create(Category, {
      id: CATEGORY_IDS[6],
      name: { en: 'Glass Bottles', sv: 'Glasflaskor' },
      desc: { en: 'Bottles made of glass', sv: 'Flaskor gjorda av glas' },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const plasticBottles = em.create(Category, {
      id: CATEGORY_IDS[7],
      name: { en: 'Plastic Bottles', sv: 'Plastflaskor' },
      desc: { en: 'Bottles made of plastic', sv: 'Flaskor gjorda av plast' },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const smartphones = em.create(Category, {
      id: CATEGORY_IDS[8],
      name: { en: 'Smartphones', sv: 'Smartphones' },
      desc: {
        en: 'Mobile phones with advanced computing capability',
        sv: 'Mobiltelefoner med avancerad datorkapacitet',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const laptops = em.create(Category, {
      id: CATEGORY_IDS[9],
      name: { en: 'Laptops', sv: 'Bärbara datorer' },
      desc: { en: 'Portable personal computers', sv: 'Bärbara persondatorer' },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create edges
    em.create(CategoryEdge, { parent: root, child: packaging })
    em.create(CategoryEdge, { parent: root, child: electronics })
    em.create(CategoryEdge, { parent: packaging, child: bottles })
    em.create(CategoryEdge, { parent: packaging, child: cans })
    em.create(CategoryEdge, { parent: electronics, child: phones })
    em.create(CategoryEdge, { parent: electronics, child: computers })
    em.create(CategoryEdge, { parent: bottles, child: glassBottles })
    em.create(CategoryEdge, { parent: bottles, child: plasticBottles })
    em.create(CategoryEdge, { parent: phones, child: smartphones })
    em.create(CategoryEdge, { parent: computers, child: laptops })

    // Create tree relationships
    em.create(CategoryTree, { ancestor: root, descendant: packaging, depth: String(1) })
    em.create(CategoryTree, { ancestor: root, descendant: electronics, depth: String(1) })
    em.create(CategoryTree, { ancestor: root, descendant: bottles, depth: String(2) })
    em.create(CategoryTree, { ancestor: root, descendant: cans, depth: String(2) })
    em.create(CategoryTree, { ancestor: root, descendant: phones, depth: String(2) })
    em.create(CategoryTree, { ancestor: root, descendant: computers, depth: String(2) })
    em.create(CategoryTree, { ancestor: root, descendant: glassBottles, depth: String(3) })
    em.create(CategoryTree, { ancestor: root, descendant: plasticBottles, depth: String(3) })
    em.create(CategoryTree, { ancestor: root, descendant: smartphones, depth: String(3) })
    em.create(CategoryTree, { ancestor: root, descendant: laptops, depth: String(3) })

    em.create(CategoryTree, { ancestor: packaging, descendant: bottles, depth: String(1) })
    em.create(CategoryTree, { ancestor: packaging, descendant: cans, depth: String(1) })
    em.create(CategoryTree, { ancestor: packaging, descendant: glassBottles, depth: String(2) })
    em.create(CategoryTree, { ancestor: packaging, descendant: plasticBottles, depth: String(2) })

    em.create(CategoryTree, { ancestor: electronics, descendant: phones, depth: String(1) })
    em.create(CategoryTree, { ancestor: electronics, descendant: computers, depth: String(1) })
    em.create(CategoryTree, { ancestor: electronics, descendant: smartphones, depth: String(2) })
    em.create(CategoryTree, { ancestor: electronics, descendant: laptops, depth: String(2) })

    em.create(CategoryTree, { ancestor: bottles, descendant: glassBottles, depth: String(1) })
    em.create(CategoryTree, { ancestor: bottles, descendant: plasticBottles, depth: String(1) })

    em.create(CategoryTree, { ancestor: phones, descendant: smartphones, depth: String(1) })
    em.create(CategoryTree, { ancestor: computers, descendant: laptops, depth: String(1) })

    await em.flush()
  }
}
