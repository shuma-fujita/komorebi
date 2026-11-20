#!/usr/bin/env python3
"""Export only the existing Komorebi Matsudo tile 0_0 from Geofabrik Kanto PBF.

Keep the canonical grid rules in split-map-tiles.py. This script creates a
staging tile and index only; it never alters the currently deployed map.
Requires: pip install osmium pyproj shapely ijson
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
import time

import osmium

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("komorebi_tile_split", ROOT / "split-map-tiles.py")
tile_grid = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tile_grid)

FACILITY_KEYS = ("shop", "amenity", "tourism", "office", "leisure", "healthcare")
TILE = (0, 0)
MAX_BYTES = 95_000_000


def tags_of(obj):
    return {t.k: t.v for t in obj.tags}


def relevant_way(tags):
    return any(k in tags for k in ("building", "highway", "railway", *FACILITY_KEYS))


def export(pbf: Path, destination: Path):
    if not pbf.is_file() or pbf.stat().st_size < 100_000_000:
        raise ValueError("Kanto PBF is missing or unexpectedly small")
    if destination.exists():
        raise FileExistsError(f"Output already exists (not overwriting): {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".matsudo-2km-", dir=destination.parent))
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    generated = datetime.strptime(stamp, "%Y%m%d%H%M%S").replace(
        tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
    filename = f"tile_0_0_{stamp}.json"
    tile_path = stage / filename
    selected_nodes = set()
    selected_ways = set()
    counts = Counter()
    started = time.monotonic()
    try:
        with tile_path.open("w", encoding="utf-8") as dest:
            header = {
                "schemaVersion": 1,
                "source": "OpenStreetMap contributors",
                "license": "ODbL-1.0",
                "tile": {
                    "id": "0_0", "gridX": 0, "gridY": 0,
                    "sizeM": 2000, "generatedAt": generated,
                },
            }
            dest.write(json.dumps(header, ensure_ascii=False, separators=(",", ":"))[:-1])
            dest.write(',"elements":[')
            first = True

            def emit(element):
                nonlocal first
                if not first:
                    dest.write(",")
                dest.write(json.dumps(element, ensure_ascii=False, separators=(",", ":")))
                first = False
                counts[element["type"]] += 1

            class ExportHandler(osmium.SimpleHandler):
                def node(self, n):
                    tags = tags_of(n)
                    if not any(tags.get(k) for k in FACILITY_KEYS) or not n.location.valid():
                        return
                    element = {
                        "type": "node", "id": n.id, "version": n.version,
                        "tags": tags, "lat": n.location.lat, "lon": n.location.lon,
                    }
                    if TILE in tile_grid.assigned_tiles(element):
                        selected_nodes.add(n.id)
                        emit(element)

                def way(self, w):
                    tags = tags_of(w)
                    if not relevant_way(tags):
                        return
                    try:
                        geometry = [{"lat": n.lat, "lon": n.lon} for n in w.nodes]
                    except osmium.InvalidLocationError:
                        counts["ways_missing_nodes"] += 1
                        return
                    if len(geometry) < 2:
                        return
                    element = {
                        "type": "way", "id": w.id, "version": w.version,
                        "tags": tags, "geometry": geometry,
                    }
                    if TILE in tile_grid.assigned_tiles(element):
                        selected_ways.add(w.id)
                        emit(element)

                def relation(self, r):
                    tags = tags_of(r)
                    if not any(tags.get(k) for k in FACILITY_KEYS):
                        return
                    if not any((m.type == "n" and m.ref in selected_nodes)
                               or (m.type == "w" and m.ref in selected_ways)
                               for m in r.members):
                        counts["relations_not_locatable"] += 1
                        return
                    emit({
                        "type": "relation", "id": r.id, "version": r.version,
                        "tags": tags,
                        "members": [
                            {"type": {"n": "node", "w": "way", "r": "relation"}.get(m.type, m.type),
                             "ref": m.ref, "role": m.role}
                            for m in r.members
                        ],
                    })

            ExportHandler().apply_file(str(pbf), locations=True)
            dest.write("]}\n")

        # Strict validation before publishing an artifact. The currently
        # deployed index and JSON are never touched.
        with tile_path.open("r", encoding="utf-8") as stream:
            result = json.load(stream)
        assert result["tile"]["id"] == "0_0"
        assert result["tile"]["sizeM"] == 2000
        assert result["source"] == "OpenStreetMap contributors"
        assert result["license"] == "ODbL-1.0"
        assert result["tile"]["gridX"] == result["tile"]["gridY"] == 0
        assert tile_grid.LAT == 35.78444 and tile_grid.LON == 139.90061
        elements = result["elements"]
        buildings = sum(e["type"] == "way" and bool(e["tags"].get("building"))
                        and len(e.get("geometry", [])) >= 4 for e in elements)
        roads = sum(e["type"] == "way" and bool(e["tags"].get("highway"))
                    and len(e.get("geometry", [])) >= 2 for e in elements)
        facilities = sum(any(e["tags"].get(k) for k in FACILITY_KEYS) for e in elements)
        if buildings < 10 or roads < 10 or facilities < 1:
            raise ValueError(f"Insufficient Matsudo map data: buildings={buildings}, "
                             f"roads={roads}, facilities={facilities}")
        for e in elements:
            if e["type"] in ("node", "way") and TILE not in tile_grid.assigned_tiles(e):
                raise ValueError(f"Element outside tile: {e['type']}/{e['id']}")
        size = tile_path.stat().st_size
        if size >= MAX_BYTES:
            raise ValueError(f"Tile exceeds safe size: {size:,} bytes")

        index = {"generatedAt": generated, "tiles": {"0_0": filename}}
        (stage / "index.json").write_text(
            json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8")
        report = {
            "pbf_source": "https://download.geofabrik.de/asia/japan/kanto-latest.osm.pbf",
            "center_wgs84_lat_lon": [tile_grid.LAT, tile_grid.LON],
            "tile_id": "0_0", "tile_size_m": 2000,
            "komorebi_spawn_local_x_z_m": [-42, 28],
            "elements": len(elements), "buildings": buildings, "roads": roads,
            "facilities": facilities, "counts": dict(counts),
            "json_bytes": size,
            "elapsed_seconds": round(time.monotonic() - started, 2),
        }
        (stage / "validation-report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8")
        stage.rename(destination)
        print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
        print("Verified staging JSON only. Existing Komorebi map remains unchanged.", flush=True)
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pbf", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    export(args.pbf, args.output_dir)


if __name__ == "__main__":
    main()
