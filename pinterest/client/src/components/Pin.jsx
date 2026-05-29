import React from "react";

/**
 * A single pin card. Memoized so re-layouts (which only shift `left`/`top`)
 * don't force every card to re-render.
 *
 * The image height is reserved up-front using the intrinsic aspect ratio
 * from the API. This eliminates layout shift while images stream in.
 */
function Pin({ pin, width, imageHeight }) {
  return (
    <article className="pin" style={{ width }}>
      <div className="pin__image-wrap" style={{ height: imageHeight }}>
        <img
          className="pin__image"
          src={pin.imageUrl}
          alt={pin.title}
          loading="lazy"
          decoding="async"
          width={pin.width}
          height={pin.height}
        />
        <button className="pin__save" type="button">Save</button>
      </div>
      <div className="pin__meta">
        <div className="pin__title" title={pin.title}>{pin.title}</div>
        <div className="pin__author">@{pin.author} · {pin.likes} likes</div>
      </div>
    </article>
  );
}

export default React.memo(Pin);
