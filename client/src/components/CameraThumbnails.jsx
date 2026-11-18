import { ArrowUpRight } from 'lucide-react';
import { useSecurity } from '../context/useSecurity';

const THUMBNAIL_IMAGES = {
  cam1: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&auto=format&fit=crop&q=80',
  cam2: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=400&auto=format&fit=crop&q=80',
  cam3: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&auto=format&fit=crop&q=80',
};

export const CameraThumbnails = () => {
  const { cameras, activeCameraId, setActiveCameraId } = useSecurity();

  return (
    <div className="camera-grid-section">
      {/* Header */}
      <div className="camera-section-header">
        <h4 className="camera-section-title">Camera</h4>
        <button
          className="see-all-link"
          onClick={() => {}}
          type="button"
          title="View Multi-Camera Matrix"
        >
          <span>See all</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* 3 Thumbnails side by side matching screenshot */}
      <div className="camera-thumbnails-row">
        {cameras.map((cam) => {
          const isActive = cam.id === activeCameraId;
          const imgUrl = THUMBNAIL_IMAGES[cam.id] || THUMBNAIL_IMAGES.cam1;

          return (
            <div
              key={cam.id}
              className={`camera-thumb-card ${isActive ? 'is-selected' : ''}`}
              onClick={() => setActiveCameraId(cam.id)}
              role="button"
              tabIndex={0}
              title={`Switch main feed to ${cam.name} (${cam.location})`}
            >
              {/* Thumbnail Image Container */}
              <div className="thumb-img-wrapper">
                <img src={imgUrl} alt={cam.name} className="thumb-img" />
                <div className="thumb-overlay"></div>

                {/* Badges on thumbnail */}
                <div className="thumb-badges-top">
                  <span className="thumb-badge fhd">FHD ⌄</span>
                  <span className="thumb-badge live">
                    <span className="live-dot-mini"></span>
                    Live
                  </span>
                </div>
              </div>

              {/* Title & Subtitle Below Thumbnail */}
              <div className="thumb-info-bar">
                <div className="thumb-name-row">
                  <span className="thumb-name">{cam.name}</span>
                  <ArrowUpRight size={12} className="thumb-arrow" />
                </div>
                <div className="thumb-location">{cam.location}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
