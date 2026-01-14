const VideoPlayer = ({ src }) => {
  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
      <video
        className="w-full h-full"
        controls
        src={src}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;
