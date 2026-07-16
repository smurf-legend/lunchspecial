// Article bodies are still plain text (no rich-text editor/dependency), but
// support two special block forms on their own line, surrounded by blank
// lines like any paragraph break:
//   ![alt text](https://image-url)         -> inline image
//   https://www.youtube.com/watch?v=xyz    -> embedded video (YouTube/Vimeo)
// Everything else renders as a plain paragraph, same as before.
export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; src: string; alt: string }
  | { type: "video"; embedUrl: string };

const IMAGE_RE = /^!\[(.*)\]\((\S+)\)$/;

function youtubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function vimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

export function videoEmbedUrl(url: string): string | null {
  return youtubeEmbedUrl(url) || vimeoEmbedUrl(url);
}

export function parseArticleBlocks(body: string): ArticleBlock[] {
  return body
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((block): ArticleBlock => {
      const imgMatch = block.match(IMAGE_RE);
      if (imgMatch) return { type: "image", alt: imgMatch[1], src: imgMatch[2] };

      // Only treat a block as a video if it's nothing but the URL — a
      // sentence that happens to mention a YouTube link stays a paragraph.
      if (/^\S+$/.test(block)) {
        const embedUrl = videoEmbedUrl(block);
        if (embedUrl) return { type: "video", embedUrl };
      }

      return { type: "paragraph", text: block };
    });
}
