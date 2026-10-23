/** Facebook video/reel → embeddable plugin URL (no SDK). */
export function facebookEmbed(url: string): string | null {
  if (!/facebook\.com\/(reel\/|watch|.+\/videos\/)|fb\.watch\//.test(url)) return null;
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`;
}

/** TikTok video → embed player URL. */
export function tiktokEmbed(url: string): string | null {
  const id = url.match(/tiktok\.com\/.*\/video\/(\d+)/)?.[1];
  return id ? `https://www.tiktok.com/player/v1/${id}?autoplay=1` : null;
}
