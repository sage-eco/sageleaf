import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'

// Register the PMTiles protocol once at app load rather than per map component
// instance. Re-registering on each navigation resets the internal cache and
// triggers redundant range-requests that can intermittently fail with a
// content-length error.
const protocol = new Protocol()
maplibregl.addProtocol('pmtiles', protocol.tile)

export default defineNuxtPlugin(() => {})
