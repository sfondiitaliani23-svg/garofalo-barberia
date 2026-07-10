type InstagramEmbedFallbackProps = {
  username: string;
};

export function InstagramEmbedFallback({ username }: InstagramEmbedFallbackProps) {
  return (
    <div className="contatti-instagram-embed">
      <iframe
        src={`https://www.instagram.com/${username}/embed`}
        title={`Ultimi post Instagram @${username}`}
        loading="lazy"
        allowFullScreen
        className="contatti-instagram-embed-frame"
      />
    </div>
  );
}