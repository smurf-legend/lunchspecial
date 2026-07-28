import { parseArticleBlocks, embedContainerClass } from "@/lib/articleBlocks";

export default function ArticleBody({ body }: { body: string }) {
  const blocks = parseArticleBlocks(body);

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        if (block.type === "image") {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={block.src} alt={block.alt} className="w-full rounded-lg border" />
          );
        }
        if (block.type === "embed") {
          return (
            <div key={i} className={embedContainerClass(block.platform)}>
              <iframe
                src={block.embedUrl}
                className="w-full h-full rounded-lg border"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }
        return (
          <p key={i} className="text-gray-800">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
