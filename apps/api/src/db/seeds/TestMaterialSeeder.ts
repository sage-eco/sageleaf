import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'

import { Material, MATERIAL_ROOT, MaterialEdge, MaterialTree } from '@src/process/material.entity'

export const MATERIAL_IDS = [
  'a1B2c3D4e5F6g7H8i9J0k',
  'l1M2n3O4p5Q6r7S8t9U0v',
  'w1X2y3Z4a5B6c7D8e9F0g',
  'h1I2j3K4l5M6n7O8p9Q0r',
  's1T2u3V4w5X6y7Z8a9B0c',
  'd1E2f3G4h5I6j7K8l9M0n',
  'o1P2q3R4s5T6u7V8w9X0y',
  'z1A2b3C4d5E6f7G8h9I0j',
  'k1L2m3N4o5P6q7R8s9T0u',
  'v1W2x3Y4z5A6b7C8d9E0f',
]

export class TestMaterialSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    let root = await em.findOne(Material, MATERIAL_ROOT)
    if (!root) {
      root = em.create(Material, {
        id: MATERIAL_ROOT,
        name: { xx: MATERIAL_ROOT },
        source: {},
        technical: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
    // Create top-level materials
    const plastic = em.create(Material, {
      id: MATERIAL_IDS[0],
      name: { en: 'Plastic', sv: 'Plast' },
      desc: { en: 'Plastic materials', sv: 'Plastmaterial' },
      source: {},
      technical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const metal = em.create(Material, {
      id: MATERIAL_IDS[1],
      name: { en: 'Metal', sv: 'Metall' },
      desc: { en: 'Metal materials', sv: 'Metallmaterial' },
      source: {},
      technical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create mid-level materials
    const polyethylene = em.create(Material, {
      id: MATERIAL_IDS[2],
      name: { en: 'Polyethylene', sv: 'Polyeten' },
      desc: { en: 'A type of plastic', sv: 'En typ av plast' },
      source: {},
      technical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const aluminum = em.create(Material, {
      id: MATERIAL_IDS[3],
      name: { en: 'Aluminum', sv: 'Aluminium' },
      desc: { en: 'A type of metal', sv: 'En typ av metall' },
      source: {},
      technical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const steel = em.create(Material, {
      id: MATERIAL_IDS[4],
      name: { en: 'Steel', sv: 'Stål' },
      desc: { en: 'Another type of metal', sv: 'En annan typ av metall' },
      source: {},
      technical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const pvc = em.create(Material, {
      id: MATERIAL_IDS[5],
      name: { en: 'PVC', sv: 'PVC' },
      desc: { en: 'Polyvinyl chloride, a rigid plastic', sv: 'Polyvinylklorid, en styv plast' },
      source: {},
      technical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create leaf materials
    const rpet = em.create(Material, {
      id: MATERIAL_IDS[6],
      name: { en: 'rPET', sv: 'rPET' },
      desc: { en: 'Recycled polyethylene terephthalate', sv: 'Återvunnen polyetentereftalat' },
      source: {},
      technical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const hdpe = em.create(Material, {
      id: MATERIAL_IDS[7],
      name: { en: 'HDPE', sv: 'HDPE' },
      desc: { en: 'High-density polyethylene', sv: 'Högdensitetspolyeten' },
      source: {},
      technical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const castAluminum = em.create(Material, {
      id: MATERIAL_IDS[8],
      name: { en: 'Cast Aluminum', sv: 'Gjuten aluminium' },
      desc: { en: 'Aluminum shaped by casting', sv: 'Aluminium format genom gjutning' },
      source: {},
      technical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const stainlessSteel = em.create(Material, {
      id: MATERIAL_IDS[9],
      name: { en: 'Stainless Steel', sv: 'Rostfritt stål' },
      desc: { en: 'Corrosion-resistant steel alloy', sv: 'Korrosionsbeständig stållegering' },
      source: {},
      technical: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create edges
    em.create(MaterialEdge, { parent: root, child: plastic })
    em.create(MaterialEdge, { parent: root, child: metal })
    em.create(MaterialEdge, { parent: plastic, child: polyethylene })
    em.create(MaterialEdge, { parent: plastic, child: pvc })
    em.create(MaterialEdge, { parent: metal, child: aluminum })
    em.create(MaterialEdge, { parent: metal, child: steel })
    em.create(MaterialEdge, { parent: polyethylene, child: rpet })
    em.create(MaterialEdge, { parent: polyethylene, child: hdpe })
    em.create(MaterialEdge, { parent: aluminum, child: castAluminum })
    em.create(MaterialEdge, { parent: steel, child: stainlessSteel })

    // Create tree relationships
    em.create(MaterialTree, { ancestor: root, descendant: plastic, depth: String(1) })
    em.create(MaterialTree, { ancestor: root, descendant: metal, depth: String(1) })
    em.create(MaterialTree, { ancestor: root, descendant: polyethylene, depth: String(2) })
    em.create(MaterialTree, { ancestor: root, descendant: pvc, depth: String(2) })
    em.create(MaterialTree, { ancestor: root, descendant: aluminum, depth: String(2) })
    em.create(MaterialTree, { ancestor: root, descendant: steel, depth: String(2) })
    em.create(MaterialTree, { ancestor: root, descendant: rpet, depth: String(3) })
    em.create(MaterialTree, { ancestor: root, descendant: hdpe, depth: String(3) })
    em.create(MaterialTree, { ancestor: root, descendant: castAluminum, depth: String(3) })
    em.create(MaterialTree, { ancestor: root, descendant: stainlessSteel, depth: String(3) })

    em.create(MaterialTree, { ancestor: plastic, descendant: polyethylene, depth: String(1) })
    em.create(MaterialTree, { ancestor: plastic, descendant: pvc, depth: String(1) })
    em.create(MaterialTree, { ancestor: plastic, descendant: rpet, depth: String(2) })
    em.create(MaterialTree, { ancestor: plastic, descendant: hdpe, depth: String(2) })

    em.create(MaterialTree, { ancestor: metal, descendant: aluminum, depth: String(1) })
    em.create(MaterialTree, { ancestor: metal, descendant: steel, depth: String(1) })
    em.create(MaterialTree, { ancestor: metal, descendant: castAluminum, depth: String(2) })
    em.create(MaterialTree, { ancestor: metal, descendant: stainlessSteel, depth: String(2) })

    em.create(MaterialTree, { ancestor: polyethylene, descendant: rpet, depth: String(1) })
    em.create(MaterialTree, { ancestor: polyethylene, descendant: hdpe, depth: String(1) })

    em.create(MaterialTree, { ancestor: aluminum, descendant: castAluminum, depth: String(1) })
    em.create(MaterialTree, { ancestor: steel, descendant: stainlessSteel, depth: String(1) })

    await em.flush()
  }
}
