import type { ComponentType } from "react";
import Adaptive from "./hold/Adaptive";
import BuildingTension from "./hold/BuildingTension";
import Burn from "./hold/Burn";
import Classic from "./hold/Classic";
import Dissolve from "./hold/Dissolve";
import Fold from "./hold/Fold";
import FromYourFinger from "./hold/FromYourFinger";
import IntoTheBin from "./hold/IntoTheBin";
import PointOfNoReturn from "./hold/PointOfNoReturn";
import Shred from "./hold/Shred";
import UndoWindow from "./hold/UndoWindow";
import BlurUp from "./skeleton/BlurUp";
import Denoise from "./skeleton/Denoise";
import Dust from "./skeleton/Dust";
import Frost from "./skeleton/Frost";
import Ink from "./skeleton/Ink";
import Melt from "./skeleton/Melt";
import Morph from "./skeleton/Morph";
import OneLight from "./skeleton/OneLight";
import OutOfOrder from "./skeleton/OutOfOrder";
import Patience from "./skeleton/Patience";
import Pencil from "./skeleton/Pencil";

// Every lab demo, by the name experiments refer to it with (see Lab.ts)
export const DEMOS = {
  "hold-classic": Classic,
  "hold-into-the-bin": IntoTheBin,
  "hold-dissolve": Dissolve,
  "hold-burn": Burn,
  "hold-shred": Shred,
  "hold-fold": Fold,
  "hold-point-of-no-return": PointOfNoReturn,
  "hold-from-your-finger": FromYourFinger,
  "hold-building-tension": BuildingTension,
  "hold-undo-window": UndoWindow,
  "hold-adaptive": Adaptive,
  "skeleton-frost": Frost,
  "skeleton-dust": Dust,
  "skeleton-denoise": Denoise,
  "skeleton-pencil": Pencil,
  "skeleton-melt": Melt,
  "skeleton-morph": Morph,
  "skeleton-one-light": OneLight,
  "skeleton-ink": Ink,
  "skeleton-blur-up": BlurUp,
  "skeleton-out-of-order": OutOfOrder,
  "skeleton-patience": Patience,
} satisfies Record<string, ComponentType>;

export type DemoName = keyof typeof DEMOS;
