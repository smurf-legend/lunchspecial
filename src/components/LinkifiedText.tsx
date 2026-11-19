import { Fragment } from "react";

// Turns plain http(s) URLs in user-supplied text into links. Rendered as React
// elements (never raw HTML), so nothing in the text can inject markup.
const URL_RE = /(https?:\/\/[^\s<]+)/g;

export default function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        // Trailing punctuation belongs to the sentence, not the link.
        const m = part.match(/^(.*?)([.,;:!?)\]]*)$/)!;
        const href = m[1];
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="nofollow ugc noopener noreferrer"
              className="text-orange-600 underline break-all"
            >
              {href}
            </a>
            {m[2]}
          </Fragment>
        );
      })}
    </>
  );
}
