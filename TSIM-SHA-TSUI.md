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

## V57 — K11 MUSEA, Peninsula and scale refinement
Added K11 MUSEA's stepped limestone-coloured volumes, bronze window bays, planted terraces and circular upper facade openings. Replaced the Peninsula placeholder with an open arrival court, seven-level historic wings, cornices/window sills and a distinct rear tower with rooftop helipads. Added direct study views for both.

Applied explicit per-landmark scale transforms to geometry, labels and collision bounds: narrower Clock Tower retains its 44m body reference; pier shrinks in width/height/length; Cultural Centre and Art Museum footprints contract; Space Museum shell becomes approximately 38m in diameter. These are authored proportional estimates, not surveyed footprints. The Space Museum's documented 23m diameter is the interior projection screen and is NOT used as an exterior building dimension. Benches are now 2m long, rail posts 2.5m apart, palms reduced to roughly 8m above the promenade.

References: https://www.k11musea.com/art-and-culture/architecture/ ; https://www.kpf.com/project/k11-musea ; https://hk.space.museum/en/web/spm/about-us.html ; https://www.hongkongheritage.org/ . Original harbour coordinates and shoreline remain interpreted, so precise real-world spacing is still outstanding. Six geometry/integration and seven input checks pass. Total authored TST geometry is 84,852 vertices; no measured mobile performance or GPU visual acceptance is claimed.

## V58 — layout reconstruction after user visual rejection
The user screenshots showed a vacant paved expanse and landmarks scattered far apart. This revision uses the LCSD Cultural Centre site plan as the primary adjacency reference, visually inspected directly:
https://www.lcsd.gov.hk/en/hkcc/common/images/Maps/HKCC%20Site%20Map_202210.jpg
District context: https://www.landsd.gov.hk/doc/en/mapping/ehkg/MapPages/GeoPDF/KN12_TsimShaTsui.pdf

Moved the Cultural Centre, Art Museum and Space Museum into a compact waterfront cluster. Moved the Peninsula across Salisbury Road, added the ferry interchange, Salisbury Garden and interpreted Regent/Sheraton/YMCA/1881 masses. Replaced the local sinusoidal shore with a piecewise shoreline, refined coast triangulation and kept coastal foam aligned with the new shoreline. Narrowed the promenade and added occupied rear street blocks.

This is a map-informed layout redesign, not a verified aerial trace. Surrounding masses still need reference-faithful architectural work. No game-camera screenshot acceptance was possible: managed browser controls are unavailable. Seven geometry/layout checks and seven input checks pass; these do NOT establish visual fidelity. V58 is a layout trial, not a claim of finished realism.
