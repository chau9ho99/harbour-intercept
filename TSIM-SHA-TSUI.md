# V56 — Tsim Sha Tsui waterfront, first pass

Builds the north bank's first authored landmark cluster using the existing interpreted harbour coordinates. This is a 3D architectural interpretation, not a surveyed model or photogrammetry.

## Added
- Star Ferry pier: deck, piles, open bays, two floor levels and green pitched roofs.
- Clock Tower: red-brick shaft, granite bands, four readable clock faces, belfry columns, copper-coloured roof and lightning rod. Main body is 44 game metres above its base, plus a 7 metre rod.
- Cultural Centre: two broad pale-pink curved roof profiles, opaque walls, arcade and forecourt pool. The roof profile is authored in strips rather than stacked boxes.
- Museum of Art: horizontal mass, recessed harbour-facing glazing and pale facade fins.
- Space Museum: hemisphere with outward-facing normals and a collision envelope.
- Peninsula-inspired rear mass and setback tower; not a detailed hotel replica.
- Continuous waterfront paving, railings, palms and benches, with Salisbury Road behind the museums.
- Four study views and a direct homepage button for the new coastline.

Generic building and street generation excludes the authored rectangle (x 260–1450, z 960–1550). Existing skyline outside that region remains. The original Clock Tower/Cultural Centre placeholders are removed. Added geometry is 22,740 vertices; reserve replacement removes some generic geometry.

## References
- HKTB promenade route and landmark relationship: https://www.discoverhongkong.com/eng/place-to-go/travel.guide-tsim-sha-tsui-promenade.html
- Official Clock Tower architectural features: https://www.hkculturalcentre.gov.hk/en/hkcc/TSTClockTower/AmazingFacts.html
- Government Cultural Centre location reference: https://fpf.ccidahk.gov.hk/en/location/detail.php?id=27
- Lands Department district map for future alignment refinement: https://www.landsd.gov.hk/doc/en/mapping/ehkg/MapPages/GeoPDF/KN12_TsimShaTsui.pdf

References guide recognition and broad adjacency; precise footprints, street alignment and dimensions were not extracted from the district map. No downloaded reference photographs are embedded.

## Validation and remaining work
`node tests/tst-waterfront.test.cjs` checks finite geometry, outward dome normals, collision envelopes, authored-area reservation and study view/button wiring. Existing seven flight-input regressions also pass. Real GPU visual acceptance and phone performance are unverified: the managed browser-control tool is unavailable. Future passes should refine the actual waterfront outline, pier dimensions, Cultural Centre roof profile and surrounding roads against same-angle photography and mapped footprints. Avenue of Stars sculptures, K11 MUSEA and detailed Harbour City are not part of this pass.
