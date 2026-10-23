import {
  siFacebook,
  siGithub,
  siInstagram,
  siTiktok,
  siX,
  siYoutube,
} from "simple-icons";
import type { PlatformId } from "./types";

/** Server-only: resolved into plain path strings so the client bundle stays small. */
export const iconPaths: Record<PlatformId, string> = {
  youtube: siYoutube.path,
  github: siGithub.path,
  tiktok: siTiktok.path,
  instagram: siInstagram.path,
  x: siX.path,
  facebook: siFacebook.path,
};
