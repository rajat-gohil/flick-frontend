import { useState, useEffect } from "react";
import { apiRequest } from "../lib/api";

interface StreamingProvider {
  name: string;
  logo_url: string;
  url: string;
  type: string;
}

interface StreamingOptionsProps {
  movieId: number;
  movieTitle: string;
  onProviderClick?: (url: string) => void;
}

export default function StreamingOptions({ movieId, movieTitle, onProviderClick }: StreamingOptionsProps) {
  const [providers, setProviders] = useState<StreamingProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreamingOptions = async () => {
      try {
        setLoading(true);
        const response = await apiRequest(`/api/movies/${movieId}/streaming-options/`);
        
        if (response.success) {
          setProviders(response.providers);
        }
      } catch (err) {
        // Silently fail - fallback to search button
        console.log("Streaming options fetch failed, using search fallback");
      } finally {
        setLoading(false);
      }
    };

    if (movieId) {
      fetchStreamingOptions();
    }
  }, [movieId]);

  // Simplified approach - always show search button as fallback
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-center py-4">Loading streaming options...</div>
        <div className="text-center">
          <button
            onClick={() => {
              const searchUrl = `https://www.justwatch.com/in/search?q=${encodeURIComponent(movieTitle)}`;
              window.open(searchUrl, '_blank');
            }}
            className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 text-sm"
          >
            🎬 Find Where to Watch
          </button>
        </div>
      </div>
    );
  }

  // Always show search button, plus providers if available
  return (
    <div className="space-y-3">
      {providers.length > 0 && (
        <>
          <h3 className="font-semibold text-sm">Available on:</h3>
          <div className="flex flex-wrap gap-2">
            {providers.map((provider, index) => (
              <button
                key={index}
                onClick={() => {
                  if (provider.url) {
                    window.open(provider.url, '_blank');
                    if (onProviderClick) onProviderClick(provider.url);
                  }
                }}
                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200 transition-colors"
              >
                {provider.logo_url ? (
                  <img 
                    src={provider.logo_url} 
                    alt={provider.name}
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
                    {provider.name.charAt(0)}
                  </div>
                )}
                <span className="text-xs font-medium">{provider.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
      
      {/* Always show search button as fallback */}
      <div className="text-center pt-2">
        <button
          onClick={() => {
            const searchUrl = `https://www.justwatch.com/in/search?q=${encodeURIComponent(movieTitle)}`;
            window.open(searchUrl, '_blank');
          }}
          className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 text-sm"
        >
          🎬 Find Where to Watch
        </button>
      </div>
    </div>
  );
}
