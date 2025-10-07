#!/usr/bin/env python3
"""
Fermentation Station — a tiny, no-BS CLI to:
  • Track vegetables (type + weight)
  • Calculate salt for lacto-fermentation (dry-salt % or brine %)
  • Calculate vinegar pickling brine (vinegar/water ratio + salt/sugar)
  • Brew calculator for wine/mead to hit a target ABV using sugar or honey

Data persists to a local JSON file (default: fermentation_station.json).

Usage examples:
  python fermentation_station.py veg add --type cabbage --weight 2.1kg
  python fermentation_station.py veg list
  python fermentation_station.py salt dry --veg-weight 2kg --pct 2.5
  python fermentation_station.py salt brine --volume 1500ml --pct 3
  python fermentation_station.py pickle --volume 1000ml --vinegar 1 --water 1 --salt-pct 2.5 --sugar 0
  python fermentation_station.py brew mead --volume 1gal --abv 12
  python fermentation_station.py brew wine --volume 5gal --abv 11.5 --sugar-source sugar

Defaults are sane, not magical. Override them if you actually know what you're doing.
"""

from __future__ import annotations
import argparse
import json
import os
import sys
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any

DB_FILE = os.environ.get("FERMENTATION_STATION_DB", "fermentation_station.json")

# ---------- Utilities ----------

def _parse_weight(text: str) -> float:
    """Return grams from inputs like '1200', '1.2kg', '750g', '2 lb', '3.5oz'."""
    t = text.strip().lower().replace(" ", "")
    try:
        if t.endswith("kg"):
            return float(t[:-2]) * 1000.0
        if t.endswith("g"):
            return float(t[:-1])
        if t.endswith("lb") or t.endswith("lbs"):
            v = float(t[:-2]) if t.endswith("lb") else float(t[:-3])
            return v * 453.59237
        if t.endswith("oz"):
            return float(t[:-2]) * 28.349523125
        # default: assume grams
        return float(t)
    except ValueError:
        raise argparse.ArgumentTypeError(f"Can't parse weight: {text}")


def _parse_volume(text: str) -> float:
    """Return milliliters from inputs like '1.5L', '750ml', '1gal'."""
    t = text.strip().lower().replace(" ", "")
    try:
        if t.endswith("ml"):
            return float(t[:-2])
        if t.endswith("l"):
            return float(t[:-1]) * 1000.0
        if t.endswith("gal"):
            return float(t[:-3]) * 3785.411784
        # default: assume milliliters
        return float(t)
    except ValueError:
        raise argparse.ArgumentTypeError(f"Can't parse volume: {text}")


def g_to_text(g: float) -> str:
    if g >= 1000:
        return f"{g/1000:.3f} kg"
    return f"{g:.0f} g"


def ml_to_text(ml: float) -> str:
    if ml >= 1000:
        return f"{ml/1000:.3f} L"
    return f"{ml:.0f} mL"

# ---------- Persistence ----------

@dataclass
class Veg:
    type: str
    weight_g: float

@dataclass
class DB:
    vegetables: List[Veg]

    @staticmethod
    def load(path: str = DB_FILE) -> "DB":
        if not os.path.exists(path):
            return DB(vegetables=[])
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        veggies = [Veg(**v) for v in data.get("vegetables", [])]
        return DB(vegetables=veggies)

    def save(self, path: str = DB_FILE) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"vegetables": [asdict(v) for v in self.vegetables]}, f, indent=2)

# ---------- Calculators ----------

class SaltCalc:
    @staticmethod
    def dry_salt(veg_weight_g: float, pct: float = 2.5) -> Dict[str, float]:
        """Salt = veg_weight * (pct/100). Typical: 2–3%."""
        salt_g = veg_weight_g * (pct / 100.0)
        return {"salt_g": salt_g, "veg_weight_g": veg_weight_g, "pct": pct}

    @staticmethod
    def brine(volume_ml: float, pct: float = 3.0) -> Dict[str, float]:
        """Brine salt % is by water weight. Assume 1 mL ≈ 1 g."""
        water_g = volume_ml  # close enough for kitchen work
        salt_g = water_g * (pct / 100.0)
        return {"salt_g": salt_g, "water_ml": volume_ml, "pct": pct}

class PickleCalc:
    @staticmethod
    def vinegar_brine(volume_ml: float, vinegar_parts: int = 1, water_parts: int = 1,
                       salt_pct: float = 2.5, sugar_g_per_l: float = 0.0,
                       vinegar_acidity: float = 5.0) -> Dict[str, float]:
        """
        Simple vinegar brine calculator.
        - volume_ml: total brine volume you'd like to make
        - ratio e.g., 1:1 vinegar:water (USDA minimum is typically 1:1 with 5% vinegar for safety)
        - salt_pct: % by total brine weight (approx = % by volume)
        - sugar_g_per_l: optional sugar grams per liter (0 for dill, >0 for bread & butter)
        """
        if vinegar_parts <= 0 or water_parts < 0:
            raise ValueError("Parts must be positive; water can be zero if you're going hardcore.")
        total_parts = vinegar_parts + water_parts
        vinegar_ml = volume_ml * (vinegar_parts / total_parts)
        water_ml = volume_ml * (water_parts / total_parts)
        salt_g = volume_ml * (salt_pct / 100.0)  # approx
        sugar_g = (volume_ml / 1000.0) * sugar_g_per_l
        return {
            "vinegar_ml": vinegar_ml,
            "water_ml": water_ml,
            "salt_g": salt_g,
            "sugar_g": sugar_g,
            "vinegar_acidity_pct": vinegar_acidity,
            "salt_pct": salt_pct,
        }

class BrewCalc:
    """
    Rough brewing math to hit a target ABV. Assumptions:
     • ABV ≈ 131.25 * (OG - FG)
     • Target FG defaults to 1.000 (dry). Adjust with --fg if needed.
     • PPG (points per pound per gallon): sugar=46, honey=35 (rule of thumb)
    """
    PPG = {
        "sugar": 46.0,   # sucrose/dextrose
        "honey": 35.0,   # typical
    }

    @staticmethod
    def sugar_needed(volume_ml: float, target_abv: float, source: str = "honey", fg: float = 1.000) -> Dict[str, float]:
        vol_gal = volume_ml / 3785.411784
        og = target_abv / 131.25 + fg
        points = (og - 1.0) * 1000.0  # points per gallon
        total_points = points * vol_gal
        ppg = BrewCalc.PPG[source]
        pounds = total_points / ppg
        grams = pounds * 453.59237
        # For honey also report a volume-ish estimate (1 lb honey ≈ 1.36 cups ≈ 0.32 L)
        honey_cups = pounds * 1.36
        honey_ml = pounds * 0.32 * 1000.0
        return {
            "volume_ml": volume_ml,
            "target_abv_pct": target_abv,
            "fg": fg,
            "og": og,
            "total_points": total_points,
            "source": source,
            "mass_g": grams,
            "mass_lb": grams / 453.59237,
            "honey_estimate_ml": honey_ml if source == "honey" else 0.0,
            "honey_estimate_cups": honey_cups if source == "honey" else 0.0,
        }

# ---------- CLI ----------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="fermentation_station", description="Track veggies, calculate salt/pickle brines, and brew mead/wine.")
    sub = p.add_subparsers(dest="cmd", required=True)

    # veg
    veg = sub.add_parser("veg", help="Manage vegetables DB")
    veg_sub = veg.add_subparsers(dest="veg_cmd", required=True)

    veg_add = veg_sub.add_parser("add", help="Add a vegetable entry")
    veg_add.add_argument("--type", required=True, help="Type, e.g., cabbage, cucumber")
    veg_add.add_argument("--weight", required=True, type=_parse_weight, help="Weight like 2kg, 900g, 1.5lb")

    veg_list = veg_sub.add_parser("list", help="List vegetables")

    veg_clear = veg_sub.add_parser("clear", help="Clear all vegetables (dangerous)")

    # salt
    salt = sub.add_parser("salt", help="Lacto-fermentation salt calculators")
    salt_sub = salt.add_subparsers(dest="salt_cmd", required=True)

    dry = salt_sub.add_parser("dry", help="Dry-salt by vegetable weight (typical 2–3%)")
    dry.add_argument("--veg-weight", required=True, type=_parse_weight, help="Total veg weight (e.g., 2kg)")
    dry.add_argument("--pct", type=float, default=2.5, help="Salt % (2–3 typical)")

    brine = salt_sub.add_parser("brine", help="Brine by volume (salt % of water by weight)")
    brine.add_argument("--volume", required=True, type=_parse_volume, help="Brine volume to make (e.g., 1500ml or 1.5L)")
    brine.add_argument("--pct", type=float, default=3.0, help="Salt % (2–5 typical)")

    # pickle
    pk = sub.add_parser("pickle", help="Vinegar brine calculator")
    pk.add_argument("--volume", required=True, type=_parse_volume, help="Total brine volume to make")
    pk.add_argument("--vinegar", type=int, default=1, help="Vinegar parts (e.g., 1 in 1:1)")
    pk.add_argument("--water", type=int, default=1, help="Water parts (e.g., 1 in 1:1)")
    pk.add_argument("--salt-pct", type=float, default=2.5, help="Salt %% of total brine (by approx weight)")
    pk.add_argument("--sugar", type=float, default=0.0, help="Sugar grams per liter (0 for dill)")
    pk.add_argument("--vinegar-acidity", type=float, default=5.0, help="Vinegar acidity %% (use 5% store-bought unless you like botulism)")

    # brew
    brew = sub.add_parser("brew", help="Wine/Mead calculator for target ABV")
    brew_sub = brew.add_subparsers(dest="brew_cmd", required=True)

    for mode in ("mead", "wine"):
        b = brew_sub.add_parser(mode, help=f"{mode.title()} calculator")
        b.add_argument("--volume", required=True, type=_parse_volume, help="Batch volume (e.g., 1gal, 5gal, 4L)")
        b.add_argument("--abv", required=True, type=float, help="Target ABV % (e.g., 12)")
        b.add_argument("--fg", type=float, default=1.000, help="Assumed finishing gravity (default 1.000)")
        default_source = "honey" if mode == "mead" else "sugar"
        b.add_argument("--sugar-source", choices=list(BrewCalc.PPG.keys()), default=default_source, help="Fermentable (honey=35 PPG, sugar=46 PPG)")

    return p


def cmd_veg(ns: argparse.Namespace) -> None:
    db = DB.load()
    if ns.veg_cmd == "add":
        veg = Veg(type=ns.type, weight_g=ns.weight)
        db.vegetables.append(veg)
        db.save()
        print(f"Added: {veg.type} — {g_to_text(veg.weight_g)}")
    elif ns.veg_cmd == "list":
        if not db.vegetables:
            print("No vegetables yet. Add some with 'veg add'.")
            return
        total = sum(v.weight_g for v in db.vegetables)
        for i, v in enumerate(db.vegetables, 1):
            print(f"{i:2d}. {v.type:<12} {g_to_text(v.weight_g)}")
        print(f"— Total: {g_to_text(total)}")
    elif ns.veg_cmd == "clear":
        db.vegetables.clear()
        db.save()
        print("Vegetables cleared. Try not to delete your real jars like this.")


def cmd_salt(ns: argparse.Namespace) -> None:
    if ns.salt_cmd == "dry":
        res = SaltCalc.dry_salt(ns.veg_weight, ns.pct)
        print(f"Dry-salt at {res['pct']}% for {g_to_text(res['veg_weight_g'])} veg → {g_to_text(res['salt_g'])} salt")
    elif ns.salt_cmd == "brine":
        res = SaltCalc.brine(ns.volume, ns.pct)
        print(f"Brine at {res['pct']}% for {ml_to_text(res['water_ml'])} water → {g_to_text(res['salt_g'])} salt")


def cmd_pickle(ns: argparse.Namespace) -> None:
    if ns.vinegar_acidity < 5.0 and ns.vinegar > 0:
        print("WARNING: Vinegar below 5% acidity is not recommended for shelf-stable pickles.")
    res = PickleCalc.vinegar_brine(ns.volume, ns.vinegar, ns.water, ns.salt_pct, ns.sugar, ns.vinegar_acidity)
    print(
        "Pickle brine → "
        f"{ml_to_text(res['vinegar_ml'])} vinegar ({res['vinegar_acidity_pct']:.1f}%), "
        f"{ml_to_text(res['water_ml'])} water, "
        f"{g_to_text(res['salt_g'])} salt, "
        f"{res['sugar_g']:.0f} g sugar"
    )


def cmd_brew(ns: argparse.Namespace) -> None:
    res = BrewCalc.sugar_needed(ns.volume, ns.abv, ns.sugar_source, ns.fg)
    if ns.sugar_source == "honey":
        print(
            f"Mead target {res['target_abv_pct']:.1f}% ABV in {ml_to_text(res['volume_ml'])} → "
            f"Add ~{res['mass_lb']:.2f} lb honey ({res['mass_g']:.0f} g).\n"
            f"Est. OG {res['og']:.3f}. Honey volume ≈ {res['honey_estimate_cups']:.1f} cups ({res['honey_estimate_ml']:.0f} mL)."
        )
    else:
        print(
            f"Wine target {res['target_abv_pct']:.1f}% ABV in {ml_to_text(res['volume_ml'])} → "
            f"Add ~{res['mass_lb']:.2f} lb sugar ({res['mass_g']:.0f} g).\n"
            f"Est. OG {res['og']:.3f}."
        )


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    ns = parser.parse_args(argv)

    if ns.cmd == "veg":
        cmd_veg(ns)
    elif ns.cmd == "salt":
        cmd_salt(ns)
    elif ns.cmd == "pickle":
        cmd_pickle(ns)
    elif ns.cmd == "brew":
        cmd_brew(ns)
    else:
        parser.print_help()
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
